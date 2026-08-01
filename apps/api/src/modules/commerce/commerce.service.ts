import { createHash, randomUUID } from "node:crypto";
import { Prisma, type PrismaClient } from "@prisma/client";
import type { CheckoutInput, CheckoutResult, Session } from "@amiyo/contracts";
import { withSerializableTransaction } from "../../infrastructure/database/transaction.js";
import { ApiProblem } from "../../middleware/api-problem.js";
import { OutboxRepository } from "../outbox/outbox.repository.js";

const cartInclude = { items: { orderBy: { createdAt: "asc" as const }, include: { product: { include: { shop: true } }, variant: { include: { inventory: true, media: { orderBy: { displayOrder: "asc" as const }, take: 1 } } } } } } satisfies Prisma.CartInclude;
const orderInclude = { vendorOrders: { include: { items: true } } } satisfies Prisma.OrderInclude;
type LoadedCart = Prisma.CartGetPayload<{ include: typeof cartInclude }>;
type LoadedOrder = Prisma.OrderGetPayload<{ include: typeof orderInclude }>;

function mediaUrl(key: string | undefined) { if (!key) return null; if (/^https?:\/\//.test(key)) return key; const base = process.env.OBJECT_STORAGE_PUBLIC_URL?.replace(/\/$/, ""); return base ? `${base}/${key}` : null; }
const money = (amount: bigint, currency = "BDT") => ({ amountMinor: amount.toString(), currency });

function cartDto(cart: LoadedCart) {
  const items = cart.items.map((item) => ({ id: item.id, productId: item.productId, variantId: item.variantId, productName: item.product.name, variantTitle: item.variant.title, sku: item.variant.sku, thumbnailUrl: mediaUrl(item.variant.media[0]?.storageKey), quantity: item.quantity, unitPrice: money(item.variant.priceMinor, item.variant.currency), lineTotal: money(item.variant.priceMinor * BigInt(item.quantity), item.variant.currency), availableQuantity: Math.max(0, (item.variant.inventory?.onHand ?? 0) - (item.variant.inventory?.reserved ?? 0)) }));
  const subtotal = items.reduce((sum, item) => sum + BigInt(item.lineTotal.amountMinor), 0n);
  return { id: cart.id, currency: cart.currency, items, subtotal: money(subtotal, cart.currency), itemCount: items.reduce((sum, item) => sum + item.quantity, 0), updatedAt: cart.updatedAt.toISOString() };
}

function orderDto(order: LoadedOrder) {
  return { id: order.id, orderNumber: order.orderNumber, status: order.status, subtotal: money(order.subtotalMinor, order.currency), discount: money(order.discountMinor, order.currency), delivery: money(order.deliveryMinor, order.currency), tax: money(order.taxMinor, order.currency), total: money(order.totalMinor, order.currency), version: order.version, createdAt: order.createdAt.toISOString(), vendorOrders: order.vendorOrders.map((vendor) => ({ id: vendor.id, vendorId: vendor.vendorId, shopId: vendor.shopId, status: vendor.status, subtotal: money(vendor.subtotalMinor, order.currency), discount: money(vendor.discountMinor, order.currency), delivery: money(vendor.deliveryMinor, order.currency), total: money(vendor.totalMinor, order.currency), commission: money(vendor.commissionMinor, order.currency), version: vendor.version, items: vendor.items.map((item) => ({ id: item.id, productId: item.productId, variantId: item.variantId, productName: item.productNameSnapshot, sku: item.skuSnapshot, attributes: item.attributesSnapshot as Record<string, unknown> | null, quantity: item.quantity, unitPrice: money(item.unitPriceMinor, item.currency), discount: money(item.discountMinor, item.currency), lineTotal: money(item.lineTotalMinor, item.currency) })) })) };
}

export class CommerceService {
  private readonly outbox = new OutboxRepository();
  constructor(private readonly client: PrismaClient) {}

  private async activeCart(userId: string) {
    const existing = await this.client.cart.findFirst({ where: { userId, status: "ACTIVE" }, include: cartInclude });
    if (existing) return existing;
    try { return await this.client.cart.create({ data: { userId }, include: cartInclude }); }
    catch { return this.client.cart.findFirstOrThrow({ where: { userId, status: "ACTIVE" }, include: cartInclude }); }
  }

  async cart(userId: string) { return cartDto(await this.activeCart(userId)); }

  async addItem(userId: string, variantId: string, quantity: number) {
    const variant = await this.client.productVariant.findFirst({ where: { id: variantId, active: true, product: { status: "APPROVED", vendor: { status: "APPROVED" }, shop: { status: "ACTIVE" } } }, include: { product: true, inventory: true } });
    if (!variant?.inventory) throw new ApiProblem(404, "VARIANT_NOT_AVAILABLE", "This product variant is not available");
    const cart = await this.activeCart(userId);
    const current = await this.client.cartItem.findUnique({ where: { cartId_variantId: { cartId: cart.id, variantId } } });
    const requested = (current?.quantity ?? 0) + quantity;
    if (requested > variant.inventory.onHand - variant.inventory.reserved) throw new ApiProblem(409, "INSUFFICIENT_STOCK", "Requested quantity is not available");
    await this.client.cartItem.upsert({ where: { cartId_variantId: { cartId: cart.id, variantId } }, create: { cartId: cart.id, productId: variant.productId, variantId, quantity, displayPriceMinor: variant.priceMinor, currency: variant.currency }, update: { quantity: requested, displayPriceMinor: variant.priceMinor } });
    return this.cart(userId);
  }

  async updateItem(userId: string, itemId: string, quantity: number) {
    const cart = await this.activeCart(userId); const item = await this.client.cartItem.findFirst({ where: { id: itemId, cartId: cart.id }, include: { variant: { include: { inventory: true } } } });
    if (!item) throw new ApiProblem(404, "CART_ITEM_NOT_FOUND", "Cart item not found");
    if (!item.variant.inventory || quantity > item.variant.inventory.onHand - item.variant.inventory.reserved) throw new ApiProblem(409, "INSUFFICIENT_STOCK", "Requested quantity is not available");
    await this.client.cartItem.update({ where: { id: itemId }, data: { quantity, displayPriceMinor: item.variant.priceMinor } }); return this.cart(userId);
  }

  async removeItem(userId: string, itemId: string) { const cart = await this.activeCart(userId); const result = await this.client.cartItem.deleteMany({ where: { id: itemId, cartId: cart.id } }); if (!result.count) throw new ApiProblem(404, "CART_ITEM_NOT_FOUND", "Cart item not found"); return this.cart(userId); }

  async quote(userId: string) {
    const cart = await this.activeCart(userId); if (!cart.items.length) throw new ApiProblem(409, "CART_EMPTY", "Your cart is empty");
    for (const item of cart.items) if (!item.variant.inventory || item.quantity > item.variant.inventory.onHand - item.variant.inventory.reserved) throw new ApiProblem(409, "INSUFFICIENT_STOCK", `${item.product.name} is no longer available in that quantity`);
    const dto = cartDto(cart); const subtotal = BigInt(dto.subtotal.amountMinor); const vendors = new Set(cart.items.map((item) => item.product.vendorId)).size; const delivery = BigInt(process.env.CHECKOUT_DELIVERY_FEE_MINOR || "6000") * BigInt(vendors); const expiresAt = new Date(Date.now() + 5 * 60_000).toISOString();
    return { cart: dto, subtotal: money(subtotal), discount: money(0n), delivery: money(delivery), tax: money(0n), total: money(subtotal + delivery), vendorCount: vendors, expiresAt };
  }

  async checkout(session: Session, input: CheckoutInput, idempotencyKey: string): Promise<CheckoutResult> {
    const userId = session.principal.userId; const requestHash = createHash("sha256").update(JSON.stringify(input)).digest("hex");
    return withSerializableTransaction(this.client, async (transaction) => {
      const previous = await transaction.idempotencyRecord.findUnique({ where: { scope_key: { scope: `checkout:${userId}`, key: idempotencyKey } } });
      if (previous) { if (previous.requestHash !== requestHash) throw new ApiProblem(409, "IDEMPOTENCY_KEY_REUSED", "Idempotency key was used for different checkout data"); return previous.response as CheckoutResult; }
      const address = await transaction.address.findFirst({ where: { id: input.addressId, userId } }); if (!address) throw new ApiProblem(404, "ADDRESS_NOT_FOUND", "Delivery address not found");
      const initial = await transaction.cart.findFirst({ where: { userId, status: "ACTIVE" }, include: { items: { select: { variant: { select: { inventory: { select: { id: true } } } } } } } }); if (!initial?.items.length) throw new ApiProblem(409, "CART_EMPTY", "Your cart is empty");
      for (const item of initial.items) if (item.variant.inventory) await transaction.$queryRaw`SELECT id FROM inventory_items WHERE id = ${item.variant.inventory.id}::uuid FOR UPDATE`;
      const cart = await transaction.cart.findUniqueOrThrow({ where: { id: initial.id }, include: cartInclude });
      const groups = new Map<string, typeof cart.items>(); for (const item of cart.items) { const available = (item.variant.inventory?.onHand ?? 0) - (item.variant.inventory?.reserved ?? 0); if (!item.variant.inventory || item.quantity > available || item.product.status !== "APPROVED" || item.product.shop.status !== "ACTIVE") throw new ApiProblem(409, "CHECKOUT_ITEM_UNAVAILABLE", `${item.product.name} is unavailable`); const rows = groups.get(item.product.vendorId) ?? []; rows.push(item); groups.set(item.product.vendorId, rows); }
      const subtotal = cart.items.reduce((sum, item) => sum + item.variant.priceMinor * BigInt(item.quantity), 0n); const deliveryFee = BigInt(process.env.CHECKOUT_DELIVERY_FEE_MINOR || "6000"); const delivery = deliveryFee * BigInt(groups.size); const total = subtotal + delivery; const confirmed = input.paymentMethod === "COD";
      const order = await transaction.order.create({ data: { orderNumber: `AGO-${Date.now()}-${randomUUID().slice(0, 8).toUpperCase()}`, userId, status: confirmed ? "CONFIRMED" : "PENDING_PAYMENT", subtotalMinor: subtotal, deliveryMinor: delivery, totalMinor: total, placedAt: new Date(), addresses: { create: { type: "delivery", recipientName: address.recipientName, phone: address.phone, line1: address.line1, line2: address.line2, division: address.division, district: address.district, upazila: address.upazila, unionName: address.unionName, postalCode: address.postalCode } } } });
      for (const [vendorId, items] of groups) { const vendorSubtotal = items.reduce((sum, item) => sum + item.variant.priceMinor * BigInt(item.quantity), 0n); const vendorOrder = await transaction.vendorOrder.create({ data: { orderId: order.id, vendorId, shopId: items[0]!.product.shopId, subtotalMinor: vendorSubtotal, deliveryMinor: deliveryFee, totalMinor: vendorSubtotal + deliveryFee } }); for (const item of items) { await transaction.orderItem.create({ data: { orderId: order.id, vendorOrderId: vendorOrder.id, productId: item.productId, variantId: item.variantId, productNameSnapshot: item.product.name, skuSnapshot: item.variant.sku, attributesSnapshot: item.variant.attributes ?? Prisma.JsonNull, quantity: item.quantity, unitPriceMinor: item.variant.priceMinor, lineTotalMinor: item.variant.priceMinor * BigInt(item.quantity), currency: item.variant.currency } }); await transaction.inventoryItem.update({ where: { id: item.variant.inventory!.id }, data: { reserved: { increment: item.quantity }, version: { increment: 1 } } }); await transaction.inventoryReservation.create({ data: { variantId: item.variantId, orderId: order.id, quantity: item.quantity, expiresAt: new Date(Date.now() + 30 * 60_000) } }); } }
      const provider = input.paymentMethod === "COD" ? "cod" : input.paymentMethod.toLowerCase(); const payment = await transaction.payment.create({ data: { orderId: order.id, provider, method: input.paymentMethod, status: confirmed ? "AUTHORIZED" : "REQUIRES_ACTION", amountMinor: total, attempts: { create: { attemptNumber: 1, status: confirmed ? "authorized" : "requires_action", requestSnapshot: { method: input.paymentMethod } } } } });
      const invoice = await transaction.invoice.create({ data: { orderId: order.id, number: `INV-${order.orderNumber}` } }); await transaction.cart.update({ where: { id: cart.id }, data: { status: "CONVERTED" } }); await transaction.orderStatusEvent.create({ data: { orderId: order.id, toStatus: order.status, actorType: "customer", actorId: userId } }); await this.outbox.enqueue(transaction, { aggregateType: "order", aggregateId: order.id, eventType: "order.placed", idempotencyKey: `order-placed:${order.id}`, payload: { orderId: order.id, paymentMethod: input.paymentMethod } });
      const loadedOrder = await transaction.order.findUniqueOrThrow({ where: { id: order.id }, include: orderInclude }); const result: CheckoutResult = { order: orderDto(loadedOrder), payment: { id: payment.id, orderId: payment.orderId, provider: payment.provider, method: payment.method, status: payment.status, amount: money(payment.amountMinor), refunded: money(payment.refundedMinor), version: payment.version, createdAt: payment.createdAt.toISOString() }, invoiceNumber: invoice.number, actionUrl: confirmed ? null : `${process.env.API_PUBLIC_URL || "http://localhost:4000"}/sandbox/payments/${payment.id}`, instructions: confirmed ? "Pay cash when your order is delivered." : `Complete the ${input.paymentMethod} sandbox payment.` };
      await transaction.idempotencyRecord.create({ data: { scope: `checkout:${userId}`, key: idempotencyKey, requestHash, response: result as unknown as Prisma.InputJsonValue, expiresAt: new Date(Date.now() + 24 * 60 * 60_000) } }); return result;
    });
  }
}
