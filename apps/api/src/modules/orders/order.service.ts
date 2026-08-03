import { createHash } from "node:crypto";
import { Prisma, type PrismaClient, type VendorOrderStatus } from "@prisma/client";
import type { Session, VendorOrderTransition } from "@amiyo/contracts";
import { canTransitionVendorOrder, deliveryOutboxKey } from "@amiyo/domain";
import { withSerializableTransaction } from "../../infrastructure/database/transaction.js";
import { ApiProblem } from "../../middleware/api-problem.js";
import { OutboxRepository } from "../outbox/outbox.repository.js";
import { synchronizeParentOrderStatus } from "./parent-status.service.js";

const vendorOrderInclude = {
  order: { include: { addresses: true, payments: { orderBy: { createdAt: "desc" as const }, take: 1 } } },
  shop: true,
  vendor: true,
  items: true,
  shipments: { orderBy: { createdAt: "desc" as const }, take: 1, include: { events: { orderBy: { occurredAt: "asc" as const } } } },
  dispatches: { orderBy: { createdAt: "desc" as const }, take: 1 }
} satisfies Prisma.VendorOrderInclude;
type LoadedVendorOrder = Prisma.VendorOrderGetPayload<{ include: typeof vendorOrderInclude }>;

const money = (amount: bigint, currency = "BDT") => ({ amountMinor: amount.toString(), currency });
const json = (value: unknown) => JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;

function shipmentDto(shipment: LoadedVendorOrder["shipments"][number] | undefined) {
  if (!shipment) return null;
  return { id: shipment.id, status: shipment.status, provider: shipment.provider, trackingNumber: shipment.trackingNumber, events: shipment.events.map((event) => ({ id: event.id, status: event.status, description: event.description, location: event.location, occurredAt: event.occurredAt.toISOString() })) };
}

function vendorOrderDto(row: LoadedVendorOrder) {
  return {
    id: row.id, orderId: row.orderId, orderNumber: row.order.orderNumber, vendorId: row.vendorId, shopId: row.shopId, shopName: row.shop.name, status: row.status,
    subtotal: money(row.subtotalMinor, row.order.currency), discount: money(row.discountMinor, row.order.currency), delivery: money(row.deliveryMinor, row.order.currency), total: money(row.totalMinor, row.order.currency), version: row.version, createdAt: row.createdAt.toISOString(),
    items: row.items.map((item) => ({ id: item.id, productId: item.productId, variantId: item.variantId, productName: item.productNameSnapshot, sku: item.skuSnapshot, attributes: item.attributesSnapshot as Record<string, unknown> | null, quantity: item.quantity, unitPrice: money(item.unitPriceMinor, item.currency), discount: money(item.discountMinor, item.currency), lineTotal: money(item.lineTotalMinor, item.currency) })),
    shipment: shipmentDto(row.shipments[0]), dispatchStatus: row.dispatches[0]?.status ?? null
  };
}

function requireVendorAccess(session: Session, vendorId: string, permission: "orders:read" | "orders:manage") {
  if (session.status !== "ACTIVE" || !session.permissions.includes(permission) || (!session.principal.roles.includes("SUPER_ADMIN") && !session.principal.roles.includes("OPERATIONS_ADMIN") && !session.principal.vendorIds.includes(vendorId))) throw new ApiProblem(403, "VENDOR_ORDER_FORBIDDEN", "You cannot access this vendor order");
}

function pickupFromSettings(settings: Prisma.JsonValue | null, fallbackName: string) {
  const value = settings && typeof settings === "object" && !Array.isArray(settings) ? settings as Record<string, unknown> : {};
  const pickup = value.pickupAddress && typeof value.pickupAddress === "object" && !Array.isArray(value.pickupAddress) ? value.pickupAddress as Record<string, unknown> : {};
  return { name: String(pickup.name || fallbackName), phone: String(pickup.phone || ""), address: String(pickup.address || pickup.line1 || ""), division: String(pickup.division || ""), district: String(pickup.district || ""), upazila: String(pickup.upazila || ""), union: String(pickup.union || pickup.unionName || "") };
}

function dispatchSnapshot(row: LoadedVendorOrder) {
  const delivery = row.order.addresses.find((address) => address.type === "delivery");
  if (!delivery) throw new ApiProblem(409, "DELIVERY_ADDRESS_MISSING", "Order delivery address is missing");
  const payment = row.order.payments[0];
  return {
    orderId: row.orderId, orderNumber: row.order.orderNumber, vendorOrderId: row.id,
    customer: { name: delivery.recipientName, phone: delivery.phone, address: [delivery.line1, delivery.line2].filter(Boolean).join(", "), division: delivery.division, district: delivery.district, upazila: delivery.upazila || "", union: delivery.unionName || "" },
    pickup: pickupFromSettings(row.shop.settings, row.shop.name),
    items: row.items.map((item) => ({ productId: item.productId, title: item.productNameSnapshot, sku: item.skuSnapshot, quantity: item.quantity, unitPriceMinor: item.unitPriceMinor.toString(), totalPriceMinor: item.lineTotalMinor.toString() })),
    paymentType: payment?.method === "COD" ? "cod" : "prepaid", codAmountMinor: payment?.method === "COD" ? row.totalMinor.toString() : "0", deliveryFeeMinor: row.deliveryMinor.toString(), currency: row.order.currency, readyForPickup: true, dispatchRequested: true
  };
}

export class OrderService {
  private readonly outbox = new OutboxRepository();
  constructor(private readonly client: PrismaClient) {}

  async vendorOrders(session: Session, status?: VendorOrderStatus) {
    if (!session.permissions.includes("orders:read")) throw new ApiProblem(403, "ORDERS_FORBIDDEN", "Order access is not allowed");
    const elevated = session.principal.roles.some((role) => ["SUPER_ADMIN", "OPERATIONS_ADMIN"].includes(role));
    const rows = await this.client.vendorOrder.findMany({ where: { ...(elevated ? {} : { vendorId: { in: session.principal.vendorIds } }), ...(status ? { status } : {}) }, include: vendorOrderInclude, orderBy: { createdAt: "desc" }, take: 100 });
    return rows.map(vendorOrderDto);
  }

  async vendorOrder(session: Session, id: string) {
    const row = await this.client.vendorOrder.findUnique({ where: { id }, include: vendorOrderInclude });
    if (!row) throw new ApiProblem(404, "VENDOR_ORDER_NOT_FOUND", "Vendor order not found");
    requireVendorAccess(session, row.vendorId, "orders:read");
    return vendorOrderDto(row);
  }

  async transitionVendorOrder(session: Session, id: string, input: VendorOrderTransition, idempotencyKey: string, correlationId?: string) {
    const scope = `vendor-order-transition:${session.principal.userId}:${id}`;
    const requestHash = createHash("sha256").update(JSON.stringify(input)).digest("hex");
    return withSerializableTransaction(this.client, async (transaction) => {
      const previous = await transaction.idempotencyRecord.findUnique({ where: { scope_key: { scope, key: idempotencyKey } } });
      if (previous) { if (previous.requestHash !== requestHash) throw new ApiProblem(409, "IDEMPOTENCY_KEY_REUSED", "Idempotency key was used for a different transition"); return previous.response; }
      const current = await transaction.vendorOrder.findUnique({ where: { id }, include: vendorOrderInclude });
      if (!current) throw new ApiProblem(404, "VENDOR_ORDER_NOT_FOUND", "Vendor order not found");
      requireVendorAccess(session, current.vendorId, "orders:manage");
      if (current.order.status === "PENDING_PAYMENT") throw new ApiProblem(409, "ORDER_PAYMENT_PENDING", "The order cannot be processed before payment confirmation");
      if (current.version !== input.expectedVersion) throw new ApiProblem(409, "VENDOR_ORDER_VERSION_CONFLICT", "Vendor order changed; refresh and try again");
      if (!canTransitionVendorOrder(current.status, input.status)) throw new ApiProblem(409, "VENDOR_ORDER_TRANSITION_INVALID", `Cannot move ${current.status} to ${input.status}`);
      await transaction.vendorOrder.update({ where: { id, version: input.expectedVersion }, data: { status: input.status, version: { increment: 1 } } });
      await this.outbox.enqueue(transaction, { aggregateType: "vendor_order", aggregateId: id, eventType: "vendor_order.status.changed", idempotencyKey: `vendor-order-status:${id}:${input.expectedVersion + 1}`, payload: { from: current.status, to: input.status, version: input.expectedVersion + 1 } });
      if (input.status === "READY_TO_SHIP") {
        const dispatchKey = deliveryOutboxKey(id);
        await transaction.shipment.upsert({ where: { vendorOrderId: id }, create: { vendorOrderId: id, status: "READY_TO_SHIP", provider: "amiyo_delivery", events: { create: { status: "READY_TO_SHIP", description: "Vendor marked the package ready for pickup", occurredAt: new Date() } } }, update: { status: "READY_TO_SHIP" } });
        const dispatch = await transaction.deliveryDispatch.upsert({ where: { dispatchKey }, create: { vendorOrderId: id, provider: "amiyo_delivery", dispatchKey, requestSnapshot: json(dispatchSnapshot(current)) }, update: {} });
        await this.outbox.enqueue(transaction, { aggregateType: "delivery_dispatch", aggregateId: dispatch.id, eventType: "delivery.dispatch.requested", idempotencyKey: dispatchKey, payload: { dispatchId: dispatch.id, idempotencyKey: dispatchKey } });
      }
      await synchronizeParentOrderStatus(transaction, current.orderId, "vendor", session.principal.userId);
      await transaction.auditLog.create({ data: { actorUserId: session.principal.userId, actorType: "user", action: "vendor_order.status.transitioned", resourceType: "vendor_order", resourceId: id, ...(correlationId ? { correlationId } : {}), before: json({ status: current.status, version: current.version }), after: json({ status: input.status, version: input.expectedVersion + 1, reason: input.reason }) } });
      const loaded = await transaction.vendorOrder.findUniqueOrThrow({ where: { id }, include: vendorOrderInclude });
      const result = vendorOrderDto(loaded);
      await transaction.idempotencyRecord.create({ data: { scope, key: idempotencyKey, requestHash, response: json(result), expiresAt: new Date(Date.now() + 24 * 60 * 60_000) } });
      return result;
    });
  }

  async customerOrders(session: Session) {
    const rows = await this.client.order.findMany({ where: { userId: session.principal.userId }, include: { _count: { select: { vendorOrders: true } } }, orderBy: { createdAt: "desc" }, take: 100 });
    return rows.map((order) => ({ id: order.id, orderNumber: order.orderNumber, status: order.status, total: money(order.totalMinor, order.currency), createdAt: order.createdAt.toISOString(), vendorOrderCount: order._count.vendorOrders }));
  }

  async customerOrder(session: Session, id: string) {
    const order = await this.client.order.findFirst({ where: { id, userId: session.principal.userId }, include: { vendorOrders: { include: { items: true } } } });
    if (!order) throw new ApiProblem(404, "ORDER_NOT_FOUND", "Order not found");
    return { id: order.id, orderNumber: order.orderNumber, status: order.status, subtotal: money(order.subtotalMinor, order.currency), discount: money(order.discountMinor, order.currency), delivery: money(order.deliveryMinor, order.currency), tax: money(order.taxMinor, order.currency), total: money(order.totalMinor, order.currency), version: order.version, createdAt: order.createdAt.toISOString(), vendorOrders: order.vendorOrders.map((vendor) => ({ id: vendor.id, vendorId: vendor.vendorId, shopId: vendor.shopId, status: vendor.status, subtotal: money(vendor.subtotalMinor, order.currency), discount: money(vendor.discountMinor, order.currency), delivery: money(vendor.deliveryMinor, order.currency), total: money(vendor.totalMinor, order.currency), commission: money(vendor.commissionMinor, order.currency), version: vendor.version, items: vendor.items.map((item) => ({ id: item.id, productId: item.productId, variantId: item.variantId, productName: item.productNameSnapshot, sku: item.skuSnapshot, attributes: item.attributesSnapshot as Record<string, unknown> | null, quantity: item.quantity, unitPrice: money(item.unitPriceMinor, item.currency), discount: money(item.discountMinor, item.currency), lineTotal: money(item.lineTotalMinor, item.currency) })) })) };
  }
  async invoice(session: Session, id: string) {
    const detail = await this.customerOrder(session, id);
    const invoice = await this.client.invoice.upsert({ where: { orderId: id }, create: { orderId: id, number: `INV-${detail.orderNumber}` }, update: {} });
    const base = process.env.OBJECT_STORAGE_PUBLIC_URL?.replace(/\/$/, ""); const storageUrl = invoice.storageKey && base ? `${base}/${invoice.storageKey.replace(/^\//, "")}` : null;
    return { id: invoice.id, number: invoice.number, issuedAt: invoice.issuedAt.toISOString(), storageUrl, order: detail };
  }

  async tracking(session: Session, id: string) {
    const order = await this.client.order.findFirst({ where: { id, userId: session.principal.userId }, include: { vendorOrders: { include: { shop: true, shipments: { orderBy: { createdAt: "desc" }, take: 1, include: { events: { orderBy: { occurredAt: "asc" } } } } } } } });
    if (!order) throw new ApiProblem(404, "ORDER_NOT_FOUND", "Order not found");
    return { orderId: order.id, orderNumber: order.orderNumber, status: order.status, shipments: order.vendorOrders.map((vendorOrder) => ({ vendorOrderId: vendorOrder.id, shopName: vendorOrder.shop.name, shipment: shipmentDto(vendorOrder.shipments[0]) })) };
  }
}
