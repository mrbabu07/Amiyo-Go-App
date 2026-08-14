import { createHash } from "node:crypto";
import { Prisma, type DeliverySetting, type PrismaClient, type ReturnStatus } from "@prisma/client";
import type { AdminCodConfirmationInput, AdminCodDeliveryInput, AdminOrderRefundInput, CancelOrder, CodReconciliationInput, CompletePayout, CompleteRefund, CreatePayoutRequest, CreateReturn, DeliveryRetryInput, DeliverySettingsInput, ReturnTransition, ReviewPayout, SellerReturnReceipt, SellerReturnResponse, ServiceabilityInput, Session } from "@amiyo/contracts";
import { assertAvailableBalance, assertRefundLimit, calculateLedgerBalance, canTransitionReturn } from "@amiyo/domain";
import { withSerializableTransaction, type TransactionClient } from "../../infrastructure/database/transaction.js";
import { ApiProblem } from "../../middleware/api-problem.js";
import { OutboxRepository } from "../outbox/outbox.repository.js";
import { synchronizeParentOrderStatus } from "../orders/parent-status.service.js";

const json = (value: unknown) => JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
const money = (amountMinor: bigint, currency = "BDT") => ({ amountMinor: amountMinor.toString(), currency });
const requestHash = (input: unknown) => createHash("sha256").update(JSON.stringify(input)).digest("hex");
const elevated = (session: Session) => session.principal.roles.some((role) => ["FINANCE_ADMIN", "OPERATIONS_ADMIN", "SUPER_ADMIN"].includes(role));
const deliveryOperator = (session: Session) => session.principal.roles.some((role) => ["OPERATIONS_ADMIN", "SUPER_ADMIN"].includes(role));

function requirePermission(session: Session, permission: string) {
  if (session.status !== "ACTIVE" || !session.permissions.includes(permission)) throw new ApiProblem(403, "OPERATION_FORBIDDEN", "You cannot perform this operation");
}

function returnDto(row: Prisma.ReturnGetPayload<{ include: { items: true } }>) {
  return { id: row.id, orderId: row.orderId, vendorOrderId: row.vendorOrderId, status: row.status, reasonCode: row.reasonCode, reasonDetail: row.reasonDetail, requestedAmount: money(row.requestedMinor, row.currency), approvedAmount: row.approvedMinor === null ? null : money(row.approvedMinor, row.currency), version: row.version, createdAt: row.createdAt.toISOString(), items: row.items.map((item) => ({ id: item.id, orderItemId: item.orderItemId, quantity: item.quantity, requestedAmount: money(item.requestedMinor, row.currency), inspection: item.inspection as Record<string, unknown> | null })) };
}

async function replay(transaction: TransactionClient, scope: string, key: string, input: unknown) {
  const hash = requestHash(input);
  const record = await transaction.idempotencyRecord.findUnique({ where: { scope_key: { scope, key } } });
  if (record && record.requestHash !== hash) throw new ApiProblem(409, "IDEMPOTENCY_KEY_REUSED", "Idempotency key was used with different input");
  return { hash, response: record?.response };
}

async function remember(transaction: TransactionClient, scope: string, key: string, hash: string, response: unknown) {
  await transaction.idempotencyRecord.create({ data: { scope, key, requestHash: hash, response: json(response), expiresAt: new Date(Date.now() + 24 * 60 * 60_000) } });
}

async function wallet(transaction: TransactionClient, vendorId: string) {
  return transaction.vendorWallet.upsert({ where: { vendorId }, create: { vendorId }, update: {}, include: { entries: true } });
}

export class OperationsService {
  private readonly outbox = new OutboxRepository();
  constructor(private readonly client: PrismaClient) {}

  private async deliverySettingsRow() { return this.client.deliverySetting.upsert({ where: { key: "default" }, create: {}, update: {} }); }
  private deliverySettingsDto(row: DeliverySetting) { return { key: "default" as const, standardChargeMinor: row.standardChargeMinor.toString(), freeDeliveryEnabled: row.freeDeliveryEnabled, freeDeliveryThresholdMinor: row.freeDeliveryThresholdMinor.toString(), baseLocation: { division: row.baseDivision, district: row.baseDistrict, upazila: row.baseUpazila, union: row.baseUnion }, zoneFees: { sameUnionMinor: row.sameUnionFeeMinor.toString(), sameUpazilaMinor: row.sameUpazilaFeeMinor.toString(), sameDistrictMinor: row.sameDistrictFeeMinor.toString(), outsideDistrictMinor: row.outsideDistrictFeeMinor.toString() }, estimatedDays: { min: row.estimatedMinDays, max: row.estimatedMaxDays }, version: row.version }; }
  async deliverySettings() { return this.deliverySettingsDto(await this.deliverySettingsRow()); }
  async serviceability(input: ServiceabilityInput) { const row = await this.deliverySettingsRow(); const same = (left: string, right: string) => left.trim().localeCompare(right.trim(), undefined, { sensitivity: "accent" }) === 0; const zone = same(input.union, row.baseUnion) && same(input.upazila, row.baseUpazila) && same(input.district, row.baseDistrict) ? "same_union" : same(input.upazila, row.baseUpazila) && same(input.district, row.baseDistrict) ? "same_upazila" : same(input.district, row.baseDistrict) ? "same_district" : "outside_district"; const zoneFee = zone === "same_union" ? row.sameUnionFeeMinor : zone === "same_upazila" ? row.sameUpazilaFeeMinor : zone === "same_district" ? row.sameDistrictFeeMinor : row.outsideDistrictFeeMinor; const subtotal = BigInt(input.subtotalMinor); const freeDelivery = row.freeDeliveryEnabled && subtotal >= row.freeDeliveryThresholdMinor; const charge = freeDelivery ? 0n : zoneFee; const remaining = row.freeDeliveryEnabled && subtotal < row.freeDeliveryThresholdMinor ? row.freeDeliveryThresholdMinor - subtotal : 0n; return { serviceable: true, zone, charge: money(charge), freeDelivery, amountNeededForFreeDelivery: money(remaining), estimatedDays: { min: row.estimatedMinDays, max: row.estimatedMaxDays } }; }
  async updateDeliverySettings(session: Session, input: DeliverySettingsInput) { requirePermission(session, "settings:manage"); const current = await this.deliverySettingsRow(); if (current.version !== input.expectedVersion) throw new ApiProblem(409, "DELIVERY_SETTINGS_VERSION_CONFLICT", "Delivery settings changed; refresh and try again"); const updated = await this.client.deliverySetting.update({ where: { key: "default" }, data: { standardChargeMinor: BigInt(input.standardChargeMinor), freeDeliveryEnabled: input.freeDeliveryEnabled, freeDeliveryThresholdMinor: BigInt(input.freeDeliveryThresholdMinor), baseDivision: input.baseLocation.division, baseDistrict: input.baseLocation.district, baseUpazila: input.baseLocation.upazila, baseUnion: input.baseLocation.union, sameUnionFeeMinor: BigInt(input.zoneFees.sameUnionMinor), sameUpazilaFeeMinor: BigInt(input.zoneFees.sameUpazilaMinor), sameDistrictFeeMinor: BigInt(input.zoneFees.sameDistrictMinor), outsideDistrictFeeMinor: BigInt(input.zoneFees.outsideDistrictMinor), estimatedMinDays: input.estimatedDays.min, estimatedMaxDays: input.estimatedDays.max, version: { increment: 1 } } }); await this.client.auditLog.create({ data: { actorUserId: session.principal.userId, actorType: "admin", action: "delivery.settings.updated", resourceType: "delivery_settings", resourceId: "default", before: json(this.deliverySettingsDto(current)), after: json(this.deliverySettingsDto(updated)) } }); return this.deliverySettingsDto(updated); }

  async cancelOrder(session: Session, orderId: string, input: CancelOrder, key: string, correlationId?: string) {
    requirePermission(session, "orders:manage");
    const adminCancellation = session.permissions.includes("admin:manage");
    const scope = `order-cancel:${session.principal.userId}:${orderId}`;
    return withSerializableTransaction(this.client, async (transaction) => {
      const prior = await replay(transaction, scope, key, input); if (prior.response) return prior.response;
      const order = await transaction.order.findFirst({ where: { id: orderId, ...(adminCancellation ? {} : { userId: session.principal.userId }) }, include: { vendorOrders: true, payments: { orderBy: { createdAt: "desc" }, take: 1 }, reservations: { where: { status: "ACTIVE" } } } });
      if (!order) throw new ApiProblem(404, "ORDER_NOT_FOUND", "Order not found");
      if (order.version !== input.expectedVersion) throw new ApiProblem(409, "ORDER_VERSION_CONFLICT", "Order changed; refresh and try again");
      if (!["PENDING_PAYMENT", "CONFIRMED", "PROCESSING"].includes(order.status) || order.vendorOrders.some((item) => !["PLACED", "ACCEPTED", "PROCESSING"].includes(item.status))) throw new ApiProblem(409, "ORDER_CANCELLATION_NOT_ALLOWED", "Order can no longer be cancelled");
      for (const reservation of order.reservations) {
        const inventory = await transaction.inventoryItem.findUniqueOrThrow({ where: { variantId: reservation.variantId } });
        await transaction.inventoryItem.update({ where: { id: inventory.id }, data: { reserved: { decrement: reservation.quantity }, version: { increment: 1 }, movements: { create: { type: "RELEASE", quantity: reservation.quantity, referenceType: "order", referenceId: order.id, idempotencyKey: `cancel-release:${reservation.id}` } } } });
      }
      await transaction.inventoryReservation.updateMany({ where: { orderId, status: "ACTIVE" }, data: { status: "RELEASED" } });
      await transaction.vendorOrder.updateMany({ where: { orderId }, data: { status: "CANCELLED", version: { increment: 1 } } });
      await transaction.order.update({ where: { id: orderId }, data: { status: "CANCELLED", version: { increment: 1 }, statusEvents: { create: { fromStatus: order.status, toStatus: "CANCELLED", actorType: adminCancellation ? "admin" : "customer", actorId: session.principal.userId, reason: input.reason } } } });
      const payment = order.payments[0];
      if (payment && ["CAPTURED", "PARTIALLY_REFUNDED"].includes(payment.status)) {
        const refundable = payment.amountMinor - payment.refundedMinor; assertRefundLimit(payment.amountMinor, payment.refundedMinor, refundable);
        await transaction.refund.create({ data: { orderId, paymentId: payment.id, amountMinor: refundable, currency: payment.currency, reason: `Cancellation: ${input.reason}` } });
      } else if (payment && !["FAILED", "CANCELLED", "EXPIRED", "REFUNDED"].includes(payment.status)) await transaction.payment.update({ where: { id: payment.id }, data: { status: "CANCELLED", version: { increment: 1 } } });
      await this.outbox.enqueue(transaction, { aggregateType: "order", aggregateId: orderId, eventType: "order.cancelled", idempotencyKey: `order-cancelled:${orderId}`, payload: { reason: input.reason } });
      await transaction.auditLog.create({ data: { actorUserId: session.principal.userId, actorType: adminCancellation ? "admin" : "customer", action: adminCancellation ? "order.admin_cancelled" : "order.cancelled", resourceType: "order", resourceId: orderId, ...(correlationId ? { correlationId } : {}), before: json({ status: order.status }), after: json({ status: "CANCELLED", reason: input.reason }) } });
      const result = { id: orderId, status: "CANCELLED", version: order.version + 1 }; await remember(transaction, scope, key, prior.hash, result); return result;
    });
  }

  async createReturn(session: Session, input: CreateReturn, key: string, correlationId?: string) {
    requirePermission(session, "returns:manage");
    const scope = `return-create:${session.principal.userId}:${input.vendorOrderId}`;
    return withSerializableTransaction(this.client, async (transaction) => {
      const prior = await replay(transaction, scope, key, input); if (prior.response) return prior.response;
      const vendorOrder = await transaction.vendorOrder.findFirst({ where: { id: input.vendorOrderId, status: "DELIVERED", order: { userId: session.principal.userId } }, include: { order: true, items: { include: { returnItems: { where: { returnRequest: { status: { notIn: ["REJECTED", "CLOSED"] } } } } } } } });
      if (!vendorOrder) throw new ApiProblem(409, "RETURN_NOT_ELIGIBLE", "Only your delivered order can be returned");
      let requestedMinor = 0n; const items = input.items.map((requested) => {
        const item = vendorOrder.items.find((candidate) => candidate.id === requested.orderItemId); if (!item) throw new ApiProblem(400, "RETURN_ITEM_INVALID", "Return item does not belong to this vendor order");
        const alreadyRequested = item.returnItems.reduce((sum, row) => sum + row.quantity, 0); if (requested.quantity + alreadyRequested > item.quantity) throw new ApiProblem(409, "RETURN_QUANTITY_EXCEEDED", "Return quantity exceeds delivered quantity");
        const amount = (item.lineTotalMinor * BigInt(requested.quantity)) / BigInt(item.quantity); requestedMinor += amount; return { orderItemId: item.id, quantity: requested.quantity, requestedMinor: amount };
      });
      const created = await transaction.return.create({ data: { orderId: vendorOrder.orderId, vendorOrderId: vendorOrder.id, userId: session.principal.userId, reasonCode: input.reasonCode, reasonDetail: input.reasonDetail ?? null, refundMethod: input.refundMethod, requestedMinor, currency: vendorOrder.order.currency, items: { create: items }, events: { create: { toStatus: "REQUESTED", actorType: "customer", actorId: session.principal.userId } } }, include: { items: true } });
      await transaction.order.update({ where: { id: vendorOrder.orderId }, data: { status: "RETURN_REQUESTED", version: { increment: 1 } } });
      await this.outbox.enqueue(transaction, { aggregateType: "return", aggregateId: created.id, eventType: "return.requested", idempotencyKey: `return-requested:${created.id}`, payload: { orderId: created.orderId, vendorOrderId: created.vendorOrderId } });
      await transaction.auditLog.create({ data: { actorUserId: session.principal.userId, actorType: "customer", action: "return.requested", resourceType: "return", resourceId: created.id, ...(correlationId ? { correlationId } : {}), after: json({ requestedMinor: requestedMinor.toString(), reasonCode: input.reasonCode }) } });
      const result = returnDto(created); await remember(transaction, scope, key, prior.hash, result); return result;
    });
  }

  async returns(session: Session, admin = false) {
    if (admin && elevated(session) && session.permissions.includes("finance:read")) requirePermission(session, "finance:read"); else requirePermission(session, "returns:manage");
    const rows = await this.client.return.findMany({ where: admin && elevated(session) ? {} : { userId: session.principal.userId }, include: { items: true }, orderBy: { createdAt: "desc" }, take: 100 }); return rows.map(returnDto);
  }

  async returnDetail(session: Session, id: string) {
    requirePermission(session, "returns:manage"); if (!elevated(session)) throw new ApiProblem(403, "ADMIN_REQUIRED", "Operations access is required");
    const row = await this.client.return.findUnique({ where: { id }, include: {
      items: { include: { orderItem: { select: { productNameSnapshot: true, skuSnapshot: true, unitPriceMinor: true, lineTotalMinor: true } } } },
      order: { select: { orderNumber: true, user: { select: { normalizedEmail: true, normalizedPhone: true, profile: { select: { displayName: true } } } } } },
      vendorOrder: { select: { vendor: { select: { displayName: true, legalName: true } }, shop: { select: { name: true } } } },
      events: { orderBy: { createdAt: "asc" } }, refunds: { orderBy: { createdAt: "desc" } }
    } });
    if (!row) throw new ApiProblem(404, "RETURN_NOT_FOUND", "Return not found");
    return { ...returnDto(row), orderNumber: row.order.orderNumber, reasonDetail: row.reasonDetail, customer: { name: row.order.user?.profile?.displayName ?? "Guest customer", email: row.order.user?.normalizedEmail ?? null, phone: row.order.user?.normalizedPhone ?? null }, vendor: { name: row.vendorOrder.vendor.displayName, legalName: row.vendorOrder.vendor.legalName, shop: row.vendorOrder.shop.name }, items: row.items.map((item) => ({ id: item.id, orderItemId: item.orderItemId, name: item.orderItem.productNameSnapshot, sku: item.orderItem.skuSnapshot, quantity: item.quantity, requestedAmount: money(item.requestedMinor, row.currency), unitPrice: money(item.orderItem.unitPriceMinor, row.currency), lineTotal: money(item.orderItem.lineTotalMinor, row.currency), inspection: item.inspection as Record<string, unknown> | null })), events: row.events.map((event) => ({ id: event.id, fromStatus: event.fromStatus, toStatus: event.toStatus, actorType: event.actorType, note: event.note, createdAt: event.createdAt.toISOString() })), refunds: row.refunds.map((refund) => ({ id: refund.id, status: refund.status, amount: money(refund.amountMinor, refund.currency), providerRefundId: refund.providerRefundId, reason: refund.reason, createdAt: refund.createdAt.toISOString(), completedAt: refund.completedAt?.toISOString() ?? null })) };
  }

  async respondToVendorReturn(session: Session, id: string, input: SellerReturnResponse, key: string, correlationId?: string) {
    requirePermission(session, "returns:manage"); const vendorId = session.principal.vendorIds[0]; if (!vendorId) throw new ApiProblem(403, "VENDOR_REQUIRED", "Vendor membership is required"); const scope = `vendor-return-response:${id}`;
    return withSerializableTransaction(this.client, async (transaction) => {
      const prior = await replay(transaction, scope, key, input); if (prior.response) return prior.response;
      const current = await transaction.return.findUnique({ where: { id }, include: { items: true, vendorOrder: { select: { vendorId: true } } } });
      if (!current || current.vendorOrder.vendorId !== vendorId) throw new ApiProblem(404, "RETURN_NOT_FOUND", "Return not found for this seller");
      if (current.version !== input.expectedVersion) throw new ApiProblem(409, "RETURN_VERSION_CONFLICT", "Return changed; refresh and try again");
      if (!["REQUESTED", "REVIEWING"].includes(current.status)) throw new ApiProblem(409, "VENDOR_RETURN_RESPONSE_CLOSED", "This return no longer accepts a seller response");
      const evidenceKeys = [...new Set(input.evidenceStorageKeys)];
      if (evidenceKeys.length) {
        const evidence = await transaction.mediaUpload.findMany({ where: { userId: session.principal.userId, purpose: "return_evidence", storageKey: { in: evidenceKeys }, status: { in: ["uploaded", "processing", "ready"] } }, select: { storageKey: true } });
        if (evidence.length !== evidenceKeys.length) throw new ApiProblem(400, "RETURN_EVIDENCE_INVALID", "Every evidence file must be a completed return upload owned by the seller");
      }
      const status: ReturnStatus = input.action === "APPROVE" ? "APPROVED" : input.action === "REJECT" ? "REJECTED" : "REVIEWING";
      const metadata = json({ action: input.action, reason: input.reason ?? null, evidenceStorageKeys: evidenceKeys });
      await transaction.return.update({ where: { id, version: input.expectedVersion }, data: { status, approvedMinor: input.action === "APPROVE" ? current.requestedMinor : current.approvedMinor, version: { increment: 1 }, events: { create: { fromStatus: current.status, toStatus: status, actorType: "vendor", actorId: session.principal.userId, note: input.notes ?? input.reason ?? null, metadata } } } });
      await this.outbox.enqueue(transaction, { aggregateType: "return", aggregateId: id, eventType: `return.vendor_${input.action.toLowerCase()}`, idempotencyKey: `return-vendor-response:${id}:${input.expectedVersion + 1}`, payload: { vendorId, action: input.action } });
      await transaction.auditLog.create({ data: { actorUserId: session.principal.userId, actorType: "vendor", action: "return.vendor.responded", resourceType: "return", resourceId: id, ...(correlationId ? { correlationId } : {}), before: json({ status: current.status, version: current.version }), after: json({ status, version: current.version + 1, action: input.action, evidenceCount: input.evidenceStorageKeys.length }) } });
      const loaded = await transaction.return.findUniqueOrThrow({ where: { id }, include: { items: true } }); const result = returnDto(loaded); await remember(transaction, scope, key, prior.hash, result); return result;
    });
  }

  async confirmVendorReturnReceipt(session: Session, id: string, input: SellerReturnReceipt, key: string, correlationId?: string) {
    requirePermission(session, "returns:manage"); const vendorId = session.principal.vendorIds[0]; if (!vendorId) throw new ApiProblem(403, "VENDOR_REQUIRED", "Vendor membership is required"); const scope = `vendor-return-receipt:${id}`;
    return withSerializableTransaction(this.client, async (transaction) => {
      const prior = await replay(transaction, scope, key, input); if (prior.response) return prior.response;
      const current = await transaction.return.findUnique({ where: { id }, include: { items: true, vendorOrder: { select: { vendorId: true } } } });
      if (!current || current.vendorOrder.vendorId !== vendorId) throw new ApiProblem(404, "RETURN_NOT_FOUND", "Return not found for this seller");
      if (current.version !== input.expectedVersion) throw new ApiProblem(409, "RETURN_VERSION_CONFLICT", "Return changed; refresh and try again");
      if (current.status !== "PICKUP_SCHEDULED") throw new ApiProblem(409, "RETURN_RECEIPT_NOT_ALLOWED", "Only a picked-up return can be marked received");
      const expectedQuantity = current.items.reduce((sum, item) => sum + item.quantity, 0); if (input.receivedQuantity > expectedQuantity) throw new ApiProblem(400, "RETURN_RECEIPT_QUANTITY_INVALID", "Received quantity cannot exceed the return quantity");
      await transaction.return.update({ where: { id, version: input.expectedVersion }, data: { status: "RECEIVED", version: { increment: 1 }, events: { create: { fromStatus: current.status, toStatus: "RECEIVED", actorType: "vendor", actorId: session.principal.userId, note: input.notes ?? null, metadata: json({ condition: input.condition, receivedQuantity: input.receivedQuantity, expectedQuantity }) } } } });
      await this.outbox.enqueue(transaction, { aggregateType: "return", aggregateId: id, eventType: "return.received", idempotencyKey: `return-vendor-receipt:${id}:${input.expectedVersion + 1}`, payload: { vendorId, condition: input.condition } });
      await transaction.auditLog.create({ data: { actorUserId: session.principal.userId, actorType: "vendor", action: "return.vendor.receipt_confirmed", resourceType: "return", resourceId: id, ...(correlationId ? { correlationId } : {}), after: json({ condition: input.condition, receivedQuantity: input.receivedQuantity, version: current.version + 1 }) } });
      const loaded = await transaction.return.findUniqueOrThrow({ where: { id }, include: { items: true } }); const result = returnDto(loaded); await remember(transaction, scope, key, prior.hash, result); return result;
    });
  }

  async transitionReturn(session: Session, id: string, input: ReturnTransition, key: string, correlationId?: string) {
    requirePermission(session, "returns:manage"); if (!elevated(session)) throw new ApiProblem(403, "ADMIN_REQUIRED", "Operations access is required");
    const scope = `return-transition:${id}`;
    return withSerializableTransaction(this.client, async (transaction) => {
      const prior = await replay(transaction, scope, key, input); if (prior.response) return prior.response;
      const current = await transaction.return.findUnique({ where: { id }, include: { items: true } }); if (!current) throw new ApiProblem(404, "RETURN_NOT_FOUND", "Return not found");
      if (current.version !== input.expectedVersion) throw new ApiProblem(409, "RETURN_VERSION_CONFLICT", "Return changed; refresh and try again");
      if (!canTransitionReturn(current.status, input.status)) throw new ApiProblem(409, "RETURN_TRANSITION_INVALID", `Cannot move ${current.status} to ${input.status}`);
      const approved = input.approvedAmountMinor === undefined ? current.approvedMinor : BigInt(input.approvedAmountMinor);
      if (input.status === "APPROVED" && (approved === null || approved < 0n || approved > current.requestedMinor)) throw new ApiProblem(400, "RETURN_APPROVAL_INVALID", "Approved amount must be within requested amount");
      await transaction.return.update({ where: { id, version: input.expectedVersion }, data: { status: input.status, approvedMinor: approved, version: { increment: 1 }, events: { create: { fromStatus: current.status, toStatus: input.status, actorType: "admin", actorId: session.principal.userId, note: input.note ?? null } } } });
      if (input.status === "REFUND_PENDING") {
        const payment = await transaction.payment.findFirst({ where: { orderId: current.orderId, status: { in: ["CAPTURED", "PARTIALLY_REFUNDED"] } }, orderBy: { createdAt: "desc" } }); if (!payment || approved === null) throw new ApiProblem(409, "REFUND_PAYMENT_UNAVAILABLE", "Captured payment and approved amount are required");
        assertRefundLimit(payment.amountMinor, payment.refundedMinor, approved); await transaction.refund.create({ data: { orderId: current.orderId, paymentId: payment.id, returnId: id, amountMinor: approved, currency: current.currency, reason: `Approved return ${id}` } });
      }
      await this.outbox.enqueue(transaction, { aggregateType: "return", aggregateId: id, eventType: `return.${input.status.toLowerCase()}`, idempotencyKey: `return-status:${id}:${input.expectedVersion + 1}`, payload: { from: current.status, to: input.status } });
      await transaction.auditLog.create({ data: { actorUserId: session.principal.userId, actorType: "admin", action: "return.status.transitioned", resourceType: "return", resourceId: id, ...(correlationId ? { correlationId } : {}), before: json({ status: current.status, version: current.version }), after: json({ status: input.status, version: current.version + 1, approvedMinor: approved?.toString() }) } });
      const loaded = await transaction.return.findUniqueOrThrow({ where: { id }, include: { items: true } }); const result = returnDto(loaded); await remember(transaction, scope, key, prior.hash, result); return result;
    });
  }

  async completeRefund(session: Session, returnId: string, input: CompleteRefund, key: string) {
    requirePermission(session, "finance:manage"); if (!elevated(session)) throw new ApiProblem(403, "ADMIN_REQUIRED", "Finance admin access is required"); const scope = `refund-complete:${returnId}`;
    return withSerializableTransaction(this.client, async (transaction) => {
      const prior = await replay(transaction, scope, key, input); if (prior.response) return prior.response;
      const current = await transaction.return.findUnique({ where: { id: returnId }, include: { refunds: { where: { status: "pending" } } } }); if (!current) throw new ApiProblem(404, "RETURN_NOT_FOUND", "Return not found"); if (current.status !== "REFUND_PENDING" || current.refunds.length !== 1) throw new ApiProblem(409, "REFUND_NOT_PENDING", "Return does not have one pending refund");
      const refund = current.refunds[0]!; const payment = await transaction.payment.findUniqueOrThrow({ where: { id: refund.paymentId } }); assertRefundLimit(payment.amountMinor, payment.refundedMinor, refund.amountMinor); const refundedMinor = payment.refundedMinor + refund.amountMinor;
      await transaction.refund.update({ where: { id: refund.id }, data: { status: "completed", providerRefundId: input.providerRefundId, completedAt: new Date() } });
      await transaction.payment.update({ where: { id: payment.id }, data: { refundedMinor, status: refundedMinor === payment.amountMinor ? "REFUNDED" : "PARTIALLY_REFUNDED", version: { increment: 1 } } });
      await transaction.return.update({ where: { id: returnId }, data: { status: "REFUNDED", version: { increment: 1 }, events: { create: { fromStatus: "REFUND_PENDING", toStatus: "REFUNDED", actorType: "admin", actorId: session.principal.userId } } } });
      const vendorOrder = await transaction.vendorOrder.findUniqueOrThrow({ where: { id: current.vendorOrderId } }); const currentWallet = await wallet(transaction, vendorOrder.vendorId);
      await transaction.vendorLedgerEntry.create({ data: { walletId: currentWallet.id, direction: "DEBIT", amountMinor: refund.amountMinor, entryType: "RETURN_REFUND", referenceType: "return", referenceId: returnId, idempotencyKey: `return-refund:${returnId}` } });
      await transaction.financialLedgerEntry.create({ data: { accountType: "customer_refund", accountId: current.userId, direction: "DEBIT", amountMinor: refund.amountMinor, entryType: "RETURN_REFUND", referenceType: "return", referenceId: returnId, idempotencyKey: `financial-return-refund:${returnId}` } });
      await this.outbox.enqueue(transaction, { aggregateType: "refund", aggregateId: refund.id, eventType: "refund.completed", idempotencyKey: `refund-completed:${refund.id}`, payload: { returnId, paymentId: payment.id, amountMinor: refund.amountMinor.toString() } }); await transaction.auditLog.create({ data: { actorUserId: session.principal.userId, actorType: "admin", action: "refund.completed", resourceType: "return", resourceId: returnId, after: json({ refundId: refund.id, amountMinor: refund.amountMinor.toString(), providerRefundId: input.providerRefundId }) } });
      const result = { returnId, refundId: refund.id, status: "REFUNDED", amount: money(refund.amountMinor, refund.currency) }; await remember(transaction, scope, key, prior.hash, result); return result;
    });
  }

  async forceOrderRefund(session: Session, orderId: string, input: AdminOrderRefundInput, key: string) {
    requirePermission(session, "finance:manage"); if (!elevated(session)) throw new ApiProblem(403, "ADMIN_REQUIRED", "Finance admin access is required"); const scope = `order-refund:${orderId}`;
    return withSerializableTransaction(this.client, async (transaction) => {
      const prior = await replay(transaction, scope, key, input); if (prior.response) return prior.response;
      const order = await transaction.order.findUnique({ where: { id: orderId }, include: { payments: { where: { status: { in: ["CAPTURED", "PARTIALLY_REFUNDED"] } }, orderBy: { createdAt: "desc" }, take: 1 }, vendorOrders: true } }); if (!order) throw new ApiProblem(404, "ORDER_NOT_FOUND", "Order not found"); if (order.version !== input.expectedVersion) throw new ApiProblem(409, "ORDER_VERSION_CONFLICT", "Order changed; refresh and try again"); const payment = order.payments[0]; if (!payment) throw new ApiProblem(409, "REFUND_PAYMENT_UNAVAILABLE", "A captured payment is required"); if (!order.vendorOrders.length) throw new ApiProblem(409, "REFUND_SELLER_ALLOCATION_UNAVAILABLE", "Seller fulfillment allocation is required"); const amount = BigInt(input.amountMinor); assertRefundLimit(payment.amountMinor, payment.refundedMinor, amount); const refundedTotal = payment.refundedMinor + amount; const full = refundedTotal === payment.amountMinor;
      const changed = await transaction.order.updateMany({ where: { id: orderId, version: input.expectedVersion }, data: { ...(full ? { status: "REFUNDED" as const } : {}), version: { increment: 1 } } }); if (!changed.count) throw new ApiProblem(409, "ORDER_VERSION_CONFLICT", "Order changed; refresh and try again"); const paymentChanged = await transaction.payment.updateMany({ where: { id: payment.id, version: payment.version }, data: { refundedMinor: refundedTotal, status: full ? "REFUNDED" : "PARTIALLY_REFUNDED", version: { increment: 1 } } }); if (!paymentChanged.count) throw new ApiProblem(409, "PAYMENT_VERSION_CONFLICT", "Payment changed; refresh and try again");
      const refund = await transaction.refund.create({ data: { orderId, paymentId: payment.id, amountMinor: amount, currency: payment.currency, status: "completed", providerRefundId: input.providerRefundId, reason: input.reason, completedAt: new Date() } }); const gross = order.vendorOrders.reduce((sum, item) => sum + item.totalMinor, 0n); let allocated = 0n; for (const [index, vendorOrder] of order.vendorOrders.entries()) { const share = index === order.vendorOrders.length - 1 ? amount - allocated : gross > 0n ? amount * vendorOrder.totalMinor / gross : amount / BigInt(order.vendorOrders.length); allocated += share; if (share > 0n) { const currentWallet = await wallet(transaction, vendorOrder.vendorId); await transaction.vendorLedgerEntry.create({ data: { walletId: currentWallet.id, direction: "DEBIT", amountMinor: share, currency: payment.currency, entryType: "ADMIN_ORDER_REFUND", referenceType: "refund", referenceId: refund.id, idempotencyKey: `admin-order-refund:${refund.id}:${vendorOrder.vendorId}`, metadata: json({ orderId, reason: input.reason }) } }); } }
      await transaction.financialLedgerEntry.create({ data: { accountType: "customer_refund", accountId: order.userId ?? orderId, direction: "DEBIT", amountMinor: amount, currency: payment.currency, entryType: "ADMIN_ORDER_REFUND", referenceType: "refund", referenceId: refund.id, idempotencyKey: `financial-admin-order-refund:${refund.id}` } }); if (full) await transaction.orderStatusEvent.create({ data: { orderId, fromStatus: order.status, toStatus: "REFUNDED", actorType: "admin", actorId: session.principal.userId, reason: input.reason } }); await this.outbox.enqueue(transaction, { aggregateType: "refund", aggregateId: refund.id, eventType: "refund.completed", idempotencyKey: `admin-order-refund-completed:${refund.id}`, payload: { orderId, paymentId: payment.id, amountMinor: amount.toString() } }); await transaction.auditLog.create({ data: { actorUserId: session.principal.userId, actorType: "admin", action: "order.refund_forced", resourceType: "order", resourceId: orderId, before: json({ status: order.status, refundedMinor: payment.refundedMinor.toString() }), after: json({ ...input, refundId: refund.id, refundedTotal: refundedTotal.toString() }) } }); const result = { orderId, refundId: refund.id, status: full ? "REFUNDED" as const : "PARTIALLY_REFUNDED" as const, amount: money(amount, payment.currency), refundedTotal: money(refundedTotal, payment.currency) }; await remember(transaction, scope, key, prior.hash, result); return result;
    });
  }

  async finance(session: Session, vendorId?: string) {
    requirePermission(session, "finance:read"); const selected = vendorId ?? session.principal.vendorIds[0]; if (!selected || (!elevated(session) && !session.principal.vendorIds.includes(selected))) throw new ApiProblem(403, "VENDOR_FINANCE_FORBIDDEN", "Vendor finance access is not allowed");
    const current = await this.client.vendorWallet.findUnique({ where: { vendorId: selected } }); const entries = current ? await this.client.vendorLedgerEntry.findMany({ where: { walletId: current.id }, orderBy: { createdAt: "desc" }, take: 100 }) : []; const totals = current ? await this.client.vendorLedgerEntry.groupBy({ by: ["direction"], where: { walletId: current.id }, _sum: { amountMinor: true } }) : []; const requests = await this.client.vendorPayoutRequest.findMany({ where: { vendorId: selected }, orderBy: { requestedAt: "desc" }, take: 100 });
    const balance = totals.reduce((sum, row) => sum + (row.direction === "CREDIT" ? row._sum.amountMinor ?? 0n : -(row._sum.amountMinor ?? 0n)), 0n); return { vendorId: selected, balance: money(balance, current?.currency), entries: entries.map((entry) => ({ id: entry.id, direction: entry.direction, amount: money(entry.amountMinor, entry.currency), entryType: entry.entryType, referenceType: entry.referenceType, referenceId: entry.referenceId, createdAt: entry.createdAt.toISOString() })), payoutRequests: requests.map((request) => ({ id: request.id, bankAccountId: request.bankAccountId, amount: money(request.amountMinor, request.currency), status: request.status, requestedAt: request.requestedAt.toISOString(), version: request.version })) };
  }

  async requestPayout(session: Session, input: CreatePayoutRequest, key: string, correlationId?: string) {
    requirePermission(session, "finance:manage"); const vendorId = session.principal.vendorIds[0]; if (!vendorId) throw new ApiProblem(403, "VENDOR_REQUIRED", "Vendor membership is required"); const scope = `payout-request:${vendorId}`;
    return withSerializableTransaction(this.client, async (transaction) => {
      const prior = await replay(transaction, scope, key, input); if (prior.response) return prior.response;
      const bank = await transaction.vendorBankAccount.findFirst({ where: { id: input.bankAccountId, vendorId, verifiedAt: { not: null } } }); if (!bank) throw new ApiProblem(409, "PAYOUT_ACCOUNT_UNVERIFIED", "A verified vendor bank account is required");
      const current = await wallet(transaction, vendorId); const amount = BigInt(input.amountMinor); try { assertAvailableBalance(calculateLedgerBalance(current.entries), amount); } catch { throw new ApiProblem(409, "PAYOUT_BALANCE_INSUFFICIENT", "Payout exceeds available balance"); }
      const request = await transaction.vendorPayoutRequest.create({ data: { vendorId, bankAccountId: bank.id, amountMinor: amount } });
      await transaction.vendorLedgerEntry.create({ data: { walletId: current.id, direction: "DEBIT", amountMinor: amount, entryType: "PAYOUT_RESERVE", referenceType: "payout_request", referenceId: request.id, idempotencyKey: `payout-reserve:${request.id}` } });
      await this.outbox.enqueue(transaction, { aggregateType: "payout_request", aggregateId: request.id, eventType: "payout.requested", idempotencyKey: `payout-requested:${request.id}`, payload: { vendorId, amountMinor: amount.toString() } });
      await transaction.auditLog.create({ data: { actorUserId: session.principal.userId, actorType: "vendor", action: "payout.requested", resourceType: "payout_request", resourceId: request.id, ...(correlationId ? { correlationId } : {}), after: json({ amountMinor: amount.toString(), bankAccountId: bank.id }) } });
      const result = { id: request.id, status: request.status, version: request.version, amount: money(amount, request.currency) }; await remember(transaction, scope, key, prior.hash, result); return result;
    });
  }

  async payouts(session: Session) { requirePermission(session, "finance:read"); if (!elevated(session)) throw new ApiProblem(403, "ADMIN_REQUIRED", "Finance admin access is required"); const rows = await this.client.vendorPayoutRequest.findMany({ include: { vendor: true, bankAccount: { select: { provider: true, accountName: true, accountNumberMasked: true } }, payouts: true }, orderBy: { requestedAt: "desc" }, take: 100 }); return rows.map((row) => ({ id: row.id, vendorId: row.vendorId, vendor: { legalName: row.vendor.legalName, displayName: row.vendor.displayName }, bankAccount: row.bankAccount, amount: money(row.amountMinor, row.currency), status: row.status, version: row.version, requestedAt: row.requestedAt.toISOString(), reviewedAt: row.reviewedAt?.toISOString() ?? null, rejectionReason: row.rejectionReason, payouts: row.payouts.map((payout) => ({ id: payout.id, provider: payout.provider, providerRef: payout.providerRef, amount: money(payout.amountMinor, payout.currency), status: payout.status, paidAt: payout.paidAt?.toISOString() ?? null })) })); }

  async reviewPayout(session: Session, id: string, input: ReviewPayout, key: string) {
    requirePermission(session, "finance:manage"); if (!elevated(session)) throw new ApiProblem(403, "ADMIN_REQUIRED", "Finance admin access is required"); const scope = `payout-review:${id}`;
    return withSerializableTransaction(this.client, async (transaction) => {
      const prior = await replay(transaction, scope, key, input); if (prior.response) return prior.response; const current = await transaction.vendorPayoutRequest.findUnique({ where: { id } }); if (!current) throw new ApiProblem(404, "PAYOUT_NOT_FOUND", "Payout request not found");
      if (current.status !== "REQUESTED" || current.version !== input.expectedVersion) throw new ApiProblem(409, "PAYOUT_REVIEW_CONFLICT", "Payout request is no longer reviewable"); const status = input.action === "APPROVE" ? "APPROVED" : "REJECTED";
      await transaction.vendorPayoutRequest.update({ where: { id }, data: { status, reviewedAt: new Date(), reviewedBy: session.principal.userId, rejectionReason: input.action === "REJECT" ? input.reason ?? null : null, version: { increment: 1 } } });
      if (status === "REJECTED") { const currentWallet = await wallet(transaction, current.vendorId); await transaction.vendorLedgerEntry.create({ data: { walletId: currentWallet.id, direction: "CREDIT", amountMinor: current.amountMinor, entryType: "PAYOUT_RELEASE", referenceType: "payout_request", referenceId: id, idempotencyKey: `payout-release:${id}` } }); }
      await transaction.auditLog.create({ data: { actorUserId: session.principal.userId, actorType: "admin", action: `payout.${status.toLowerCase()}`, resourceType: "payout_request", resourceId: id, before: json({ status: current.status }), after: json({ status, reason: input.reason }) } }); const result = { id, status, version: current.version + 1 }; await remember(transaction, scope, key, prior.hash, result); return result;
    });
  }

  async completePayout(session: Session, id: string, input: CompletePayout, key: string) {
    requirePermission(session, "finance:manage"); if (!elevated(session)) throw new ApiProblem(403, "ADMIN_REQUIRED", "Finance admin access is required"); const scope = `payout-complete:${id}`;
    return withSerializableTransaction(this.client, async (transaction) => {
      const prior = await replay(transaction, scope, key, input); if (prior.response) return prior.response; const current = await transaction.vendorPayoutRequest.findUnique({ where: { id } }); if (!current) throw new ApiProblem(404, "PAYOUT_NOT_FOUND", "Payout request not found"); if (!['APPROVED','PROCESSING'].includes(current.status)) throw new ApiProblem(409, "PAYOUT_NOT_APPROVED", "Payout must be approved first");
      const payout = await transaction.vendorPayout.create({ data: { vendorId: current.vendorId, requestId: id, provider: input.provider, providerRef: input.providerRef, amountMinor: current.amountMinor, currency: current.currency, status: "PAID", paidAt: new Date() } }); await transaction.vendorPayoutRequest.update({ where: { id }, data: { status: "PAID", version: { increment: 1 } } });
      await this.outbox.enqueue(transaction, { aggregateType: "payout", aggregateId: payout.id, eventType: "payout.paid", idempotencyKey: `payout-paid:${id}`, payload: { requestId: id, vendorId: current.vendorId } }); await transaction.auditLog.create({ data: { actorUserId: session.principal.userId, actorType: "admin", action: "payout.paid", resourceType: "payout_request", resourceId: id, after: json({ provider: input.provider, providerRef: input.providerRef }) } }); const result = { id, payoutId: payout.id, status: "PAID" }; await remember(transaction, scope, key, prior.hash, result); return result;
    });
  }

  async reconcileCod(session: Session, input: CodReconciliationInput, key: string) {
    requirePermission(session, "finance:manage"); if (!elevated(session)) throw new ApiProblem(403, "ADMIN_REQUIRED", "Finance admin access is required"); const scope = "cod-reconciliation";
    return withSerializableTransaction(this.client, async (transaction) => {
      const prior = await replay(transaction, scope, key, input); if (prior.response) return prior.response; const periodStart = new Date(input.periodStart); const periodEnd = new Date(input.periodEnd);
      const collections = await transaction.codCollection.findMany({ where: { collectedAt: { gte: periodStart, lt: periodEnd } }, include: { payment: true } }); const expected = collections.reduce((sum, row) => sum + row.payment.amountMinor, 0n); const received = collections.reduce((sum, row) => sum + row.collectedMinor, 0n);
      const reconciliation = await transaction.codReconciliation.create({ data: { periodStart, periodEnd, expectedMinor: expected, receivedMinor: received, status: expected === received ? "reconciled" : "variance", items: { create: collections.map((row) => ({ collectionId: row.id, varianceMinor: row.collectedMinor - row.payment.amountMinor })) } } }); const result = { id: reconciliation.id, expected: money(expected), received: money(received), variance: money(received - expected), status: reconciliation.status }; await remember(transaction, scope, key, prior.hash, result); return result;
    });
  }

  async codWorkspace(session: Session) {
    requirePermission(session, "admin:read"); if (!elevated(session)) throw new ApiProblem(403, "ADMIN_REQUIRED", "Finance or operations admin access is required");
    const [payments, reconciliations] = await Promise.all([
      this.client.payment.findMany({ where: { method: { equals: "COD", mode: "insensitive" } }, include: { codCollection: { include: { reconciliationItems: { include: { reconciliation: true } } } }, order: { include: { user: { include: { profile: true } }, addresses: { where: { type: "delivery" }, take: 1 }, vendorOrders: { include: { vendor: true, shipments: { include: { assignment: { include: { courierPartner: true, pickupStaff: true } } }, orderBy: { updatedAt: "desc" }, take: 1 } } } } } }, orderBy: { createdAt: "desc" }, take: 1000 }),
      this.client.codReconciliation.findMany({ include: { _count: { select: { items: true } } }, orderBy: { createdAt: "desc" }, take: 250 })
    ]);
    const orders = payments.map((payment) => {
      const order = payment.order; const address = order.addresses[0]; const shipments = order.vendorOrders.flatMap((vendorOrder) => vendorOrder.shipments); const delivered = order.vendorOrders.length > 0 && order.vendorOrders.every((vendorOrder) => vendorOrder.status === "DELIVERED" || vendorOrder.shipments.some((shipment) => shipment.status === "DELIVERED")); const collection = payment.codCollection; const reconciliation = collection?.reconciliationItems.map((item) => item.reconciliation).sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())[0]; const discrepancy = collection ? collection.collectedMinor - payment.amountMinor : 0n; const courierNames = shipments.map((shipment) => shipment.assignment?.courierPartner?.name ?? shipment.assignment?.pickupStaff?.name ?? shipment.provider).filter((value): value is string => Boolean(value)); const shipmentStatus = delivered ? "DELIVERED" : shipments[0]?.status ?? "PENDING"; const paymentConfirmed = Boolean(collection) && payment.status === "CAPTURED"; const reconciliationStatus = reconciliation?.status === "reconciled" ? "remitted" as const : collection && discrepancy !== 0n ? "discrepancy" as const : collection ? "collected" as const : delivered ? "awaiting_confirmation" as const : shipmentStatus === "PENDING" ? "pending_dispatch" as const : "dispatched" as const;
      return { orderId: order.id, orderNumber: order.orderNumber, version: order.version, customerName: order.user?.profile?.displayName ?? address?.recipientName ?? "Customer", customerPhone: order.user?.normalizedPhone ?? address?.phone ?? null, vendorNames: order.vendorOrders.map((item) => item.vendor.displayName), deliveryZone: [address?.upazila, address?.district].filter(Boolean).join(", ") || "Zone not set", courierName: courierNames[0] ?? null, shipmentStatus, delivered, waitingDelivery: !delivered && !paymentConfirmed, awaitingConfirmation: delivered && !collection, paymentId: payment.id, paymentStatus: payment.status, paymentConfirmed, totalMinor: payment.amountMinor.toString(), currency: payment.currency, reconciliationStatus, collectedMinor: collection?.collectedMinor.toString() ?? null, discrepancyMinor: discrepancy.toString(), hasDiscrepancy: discrepancy !== 0n, collectorRef: collection?.collectorRef ?? null, collectedAt: collection?.collectedAt.toISOString() ?? null, createdAt: order.createdAt.toISOString() };
    });
    const confirmed = orders.filter((item) => item.paymentConfirmed); const codValue = orders.reduce((sum, item) => sum + BigInt(item.totalMinor), 0n); const collected = confirmed.reduce((sum, item) => sum + BigInt(item.collectedMinor ?? "0"), 0n); return { orders, reconciliations: reconciliations.map((item) => ({ id: item.id, periodStart: item.periodStart.toISOString(), periodEnd: item.periodEnd.toISOString(), expectedMinor: item.expectedMinor.toString(), receivedMinor: item.receivedMinor.toString(), varianceMinor: (item.receivedMinor - item.expectedMinor).toString(), currency: item.currency, status: item.status, itemCount: item._count.items, createdAt: item.createdAt.toISOString() })), summary: { totalCod: orders.length, codValueMinor: codValue.toString(), awaitingConfirmation: orders.filter((item) => item.awaitingConfirmation).length, confirmed: confirmed.length, waitingDelivery: orders.filter((item) => item.waitingDelivery).length, discrepancies: orders.filter((item) => item.hasDiscrepancy).length, remitted: orders.filter((item) => item.reconciliationStatus === "remitted").length, outstandingMinor: (codValue - collected).toString() } };
  }

  async markCodDelivered(session: Session, orderId: string, input: AdminCodDeliveryInput, key: string) {
    requirePermission(session, "admin:manage"); if (!deliveryOperator(session)) throw new ApiProblem(403, "ADMIN_REQUIRED", "Operations access is required"); const scope = `cod-delivered:${orderId}`;
    return withSerializableTransaction(this.client, async (transaction) => { const prior = await replay(transaction, scope, key, input); if (prior.response) return prior.response; const order = await transaction.order.findUnique({ where: { id: orderId }, include: { payments: { where: { method: { equals: "COD", mode: "insensitive" } }, take: 1 }, vendorOrders: { include: { shipments: true } } } }); if (!order || !order.payments.length) throw new ApiProblem(404, "COD_ORDER_NOT_FOUND", "COD order not found"); if (order.version !== input.expectedVersion) throw new ApiProblem(409, "ORDER_VERSION_CONFLICT", "Order changed; refresh and try again"); if (["CANCELLED", "RETURNED", "REFUNDED"].includes(order.status)) throw new ApiProblem(409, "COD_DELIVERY_NOT_ALLOWED", "This order cannot be marked delivered"); const deliveredAt = new Date(); for (const vendorOrder of order.vendorOrders) { const shipment = vendorOrder.shipments[0]; if (shipment?.status !== "DELIVERED") await transaction.shipment.upsert({ where: { vendorOrderId: vendorOrder.id }, create: { vendorOrderId: vendorOrder.id, provider: input.courierName, status: "DELIVERED", deliveredAt, events: { create: { status: "DELIVERED", description: input.note ?? `Delivered by ${input.courierName}`, occurredAt: deliveredAt } } }, update: { provider: input.courierName, status: "DELIVERED", deliveredAt, events: { create: { status: "DELIVERED", description: input.note ?? `Delivered by ${input.courierName}`, occurredAt: deliveredAt } } } }); if (vendorOrder.status !== "DELIVERED") await transaction.vendorOrder.update({ where: { id: vendorOrder.id }, data: { status: "DELIVERED", version: { increment: 1 } } }); } await synchronizeParentOrderStatus(transaction, orderId, "admin", session.principal.userId); await transaction.auditLog.create({ data: { actorUserId: session.principal.userId, actorType: "admin", action: "cod.order_marked_delivered", resourceType: "order", resourceId: orderId, before: json({ status: order.status, version: order.version }), after: json(input) } }); const result = { orderId, status: "DELIVERED", deliveredAt: deliveredAt.toISOString() }; await remember(transaction, scope, key, prior.hash, result); return result; });
  }

  async confirmCodPayment(session: Session, orderId: string, input: AdminCodConfirmationInput, key: string) {
    requirePermission(session, "finance:manage"); if (!elevated(session)) throw new ApiProblem(403, "ADMIN_REQUIRED", "Finance admin access is required"); const scope = `cod-confirm:${orderId}`;
    return withSerializableTransaction(this.client, async (transaction) => { const prior = await replay(transaction, scope, key, input); if (prior.response) return prior.response; const order = await transaction.order.findUnique({ where: { id: orderId }, include: { payments: { where: { method: { equals: "COD", mode: "insensitive" } }, include: { codCollection: true }, orderBy: { createdAt: "desc" }, take: 1 }, vendorOrders: { include: { shipments: true } } } }); if (!order || !order.payments.length) throw new ApiProblem(404, "COD_ORDER_NOT_FOUND", "COD order not found"); if (order.version !== input.expectedVersion) throw new ApiProblem(409, "ORDER_VERSION_CONFLICT", "Order changed; refresh and try again"); const delivered = order.vendorOrders.length > 0 && order.vendorOrders.every((vendorOrder) => vendorOrder.status === "DELIVERED" || vendorOrder.shipments.some((shipment) => shipment.status === "DELIVERED")); if (!delivered) throw new ApiProblem(409, "COD_ORDER_NOT_DELIVERED", "Confirm delivery before receiving COD cash"); const payment = order.payments[0]; if (!payment) throw new ApiProblem(404, "COD_PAYMENT_NOT_FOUND", "COD payment not found"); if (payment.codCollection) throw new ApiProblem(409, "COD_ALREADY_CONFIRMED", "COD cash has already been confirmed"); const collectedAt = new Date(); const collection = await transaction.codCollection.create({ data: { paymentId: payment.id, collectedMinor: BigInt(input.collectedAmountMinor), currency: payment.currency, collectorRef: input.reference, collectedAt } }); await transaction.payment.update({ where: { id: payment.id }, data: { status: "CAPTURED", version: { increment: 1 } } }); await transaction.auditLog.create({ data: { actorUserId: session.principal.userId, actorType: "admin", action: "cod.cash_confirmed", resourceType: "cod_collection", resourceId: collection.id, before: json({ paymentStatus: payment.status, expectedMinor: payment.amountMinor.toString() }), after: json({ ...input, varianceMinor: (collection.collectedMinor - payment.amountMinor).toString() }) } }); const result = { orderId, collectionId: collection.id, paymentStatus: "CAPTURED", collectedMinor: collection.collectedMinor.toString(), varianceMinor: (collection.collectedMinor - payment.amountMinor).toString(), collectedAt: collectedAt.toISOString() }; await remember(transaction, scope, key, prior.hash, result); return result; });
  }

  async deliveryQueue(session: Session) {
    requirePermission(session, "admin:read"); if (!deliveryOperator(session)) throw new ApiProblem(403, "ADMIN_REQUIRED", "Operations access is required");
    const rows = await this.client.deliveryDispatch.findMany({ where: { status: { in: ["PENDING", "FAILED"] } }, include: { vendorOrder: { include: { order: true } }, attempts: { orderBy: { attemptNumber: "desc" }, take: 1 } }, orderBy: { updatedAt: "asc" }, take: 100 });
    return rows.map((row) => ({ id: row.id, vendorOrderId: row.vendorOrderId, orderNumber: row.vendorOrder.order.orderNumber, dispatchKey: row.dispatchKey, status: row.status, externalOrderId: row.externalOrderId, attempts: row.attempts[0]?.attemptNumber ?? 0, lastError: row.attempts[0]?.errorMessage ?? null, updatedAt: row.updatedAt.toISOString() }));
  }

  async retryDelivery(session: Session, id: string, input: DeliveryRetryInput, key: string, correlationId?: string) {
    requirePermission(session, "admin:manage"); if (!deliveryOperator(session)) throw new ApiProblem(403, "ADMIN_REQUIRED", "Operations access is required"); const scope = `delivery-retry:${id}`;
    return withSerializableTransaction(this.client, async (transaction) => {
      const prior = await replay(transaction, scope, key, input); if (prior.response) return prior.response;
      const dispatch = await transaction.deliveryDispatch.findUnique({ where: { id } });
      if (!dispatch) throw new ApiProblem(404, "DELIVERY_DISPATCH_NOT_FOUND", "Delivery dispatch was not found");
      if (dispatch.status !== "FAILED" || dispatch.externalOrderId) throw new ApiProblem(409, "DELIVERY_RETRY_NOT_ALLOWED", "Only failed dispatches without an external order can be retried");
      const event = await transaction.outboxEvent.findFirst({ where: { aggregateType: "delivery_dispatch", aggregateId: id, eventType: "delivery.dispatch.requested" } });
      if (!event) throw new ApiProblem(409, "DELIVERY_OUTBOX_MISSING", "Delivery dispatch does not have a durable outbox event");
      const claimed = await transaction.deliveryDispatch.updateMany({ where: { id, status: "FAILED", externalOrderId: null }, data: { status: "PENDING" } });
      if (!claimed.count) throw new ApiProblem(409, "DELIVERY_RETRY_CONFLICT", "Delivery dispatch changed; refresh and try again");
      await transaction.outboxEvent.update({ where: { id: event.id }, data: { status: "pending", availableAt: new Date(), processedAt: null } });
      await transaction.auditLog.create({ data: { actorUserId: session.principal.userId, actorType: "admin", action: "delivery.dispatch.retried", resourceType: "delivery_dispatch", resourceId: id, ...(correlationId ? { correlationId } : {}), before: json({ status: dispatch.status }), after: json({ status: "PENDING", reason: input.reason, outboxEventId: event.id }) } });
      const result = { id, status: "PENDING" as const, queued: true as const }; await remember(transaction, scope, key, prior.hash, result); return result;
    });
  }

  async audit(session: Session) { requirePermission(session, "audit:read"); return this.client.auditLog.findMany({ where: { resourceType: { in: ["order", "return", "payout_request", "delivery_dispatch"] } }, orderBy: { createdAt: "desc" }, take: 100 }); }
}
