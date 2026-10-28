import { returnProductDetails, returnProductSelect } from "./return-product.js";
import { createHash, randomUUID } from "node:crypto";
import { assertReturnPolicy, effectiveReturnPolicy, loadInheritedCategoryPolicies, loadReturnPolicy } from "./return-policy.js";
import { Prisma, type DeliverySetting, type PrismaClient, type ReturnStatus } from "@prisma/client";
import type { AdminCodConfirmationInput, AdminCodDeliveryInput, AdminOrderRefundInput, CancelOrder, CodReconciliationInput, CompletePayout, CompleteRefund, CreatePayoutRequest, CreateReturn, CreateSettlementProposal, DeliveryRetryInput, DeliverySettingsInput, PickupPointInput, PickupPointUpdate, ProviderOrderRefundInput, ReturnTransition, ReviewPayout, SellerReturnReceipt, SellerReturnResponse, ServiceabilityInput, Session } from "@amiyo/contracts";
import { assertAvailableBalance, assertRefundLimit, calculateLedgerBalance, canTransitionReturn, providerReferenceValid, refundProviderRule, settlementDecision, settlementProposalDecision } from "@amiyo/domain";
import { withSerializableTransaction, type TransactionClient } from "../../infrastructure/database/transaction.js";
import { ApiProblem } from "../../middleware/api-problem.js";
import { OutboxRepository } from "../outbox/outbox.repository.js";
import { reverseLoyaltyForRefund } from "../engagement/loyalty-ledger.js";
import { synchronizeParentOrderStatus } from "../orders/parent-status.service.js";
import { loadBusinessRules } from "../admin/business-rules-config.js";
import { releaseOrderReservations } from "../commerce/inventory-reservation.js";
import { SslCommerzGateway } from "../commerce/sslcommerz.gateway.js";
import { allocateOrderRefund, assertRefundAccountingHistory, reverseSellerSettlement } from "./refund-allocation.js";
import { initiateRefundOnce } from "./provider-refund-initiation.js";
import { validateCustomerReturnEvidence } from "./return-evidence.js";

const json = (value: unknown) => JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
const money = (amountMinor: bigint, currency = "BDT") => ({ amountMinor: amountMinor.toString(), currency });
const notificationMoney = (amount: bigint) => `${(amount / 100n).toLocaleString("en-BD")}.${(amount % 100n).toString().padStart(2, "0")}`;
const requestHash = (input: unknown) => createHash("sha256").update(JSON.stringify(input)).digest("hex");
const elevated = (session: Session) => session.principal.roles.some((role) => ["FINANCE_ADMIN", "OPERATIONS_ADMIN", "SUPER_ADMIN"].includes(role));
const deliveryOperator = (session: Session) => session.principal.roles.some((role) => ["OPERATIONS_ADMIN", "SUPER_ADMIN"].includes(role));

async function verifySslRefund(gateway: SslCommerzGateway, payment: { provider: string; attempts: Array<{ responseSnapshot: Prisma.JsonValue | null }> }, reference?: string | null) {
  if (payment.provider.toLowerCase() !== "sslcommerz") return;
  const snapshot = payment.attempts[0]?.responseSnapshot as { bankTransactionId?: string } | null;
  if (!reference || typeof snapshot?.bankTransactionId !== "string" || !snapshot.bankTransactionId.trim()) throw new ApiProblem(409, "SSLCOMMERZ_REFUND_EVIDENCE_MISSING", "A refund reference and validated bank transaction are required");
  await gateway.assertRefundCompleted(reference, snapshot.bankTransactionId);
}

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

async function sellerPushEnabled(transaction: TransactionClient, vendorId: string, event: "payoutUpdate" | "returnRequest") {
  const shop = await transaction.vendorShop.findFirst({ where: { vendorId }, select: { settings: true } });
  const settings = shop?.settings && typeof shop.settings === "object" && !Array.isArray(shop.settings) ? shop.settings as Record<string, unknown> : {};
  const preferences = settings.notificationPreferences && typeof settings.notificationPreferences === "object" && !Array.isArray(settings.notificationPreferences) ? settings.notificationPreferences as Record<string, unknown> : {};
  const channel = preferences[event] && typeof preferences[event] === "object" && !Array.isArray(preferences[event]) ? preferences[event] as Record<string, unknown> : {};
  return channel.push !== false;
}

async function createSellerNotification(transaction: TransactionClient, input: { userId: string; type: string; title: string; body: string; data: Prisma.InputJsonValue; idempotencyKey: string; push: boolean }) {
  const deliveries = [{ channel: "in_app", status: "DELIVERED" as const, deliveredAt: new Date() }, ...(input.push ? [{ channel: "push", status: "PENDING" as const }] : [])];
  const notification = await transaction.notification.upsert({ where: { idempotencyKey: input.idempotencyKey }, update: {}, create: { userId: input.userId, type: input.type, title: input.title, body: input.body, data: input.data, idempotencyKey: input.idempotencyKey, deliveries: { create: deliveries } }, include: { deliveries: true } });
  for (const delivery of notification.deliveries.filter((item) => item.status === "PENDING")) await transaction.outboxEvent.upsert({ where: { idempotencyKey: `notification-delivery:${delivery.id}` }, update: {}, create: { aggregateType: "notification_delivery", aggregateId: delivery.id, eventType: "notification.delivery.requested", idempotencyKey: `notification-delivery:${delivery.id}`, payload: { notificationDeliveryId: delivery.id } } });
}

export async function notifyVendorPayoutStatus(transaction: TransactionClient, input: { requestId: string; vendorId: string; amountMinor: bigint; status: "APPROVED" | "REJECTED" | "PAID"; reason?: string | null }) {
  const [members, push] = await Promise.all([transaction.vendorMember.findMany({ where: { vendorId: input.vendorId, status: "active", user: { status: "ACTIVE" } }, select: { userId: true } }), sellerPushEnabled(transaction, input.vendorId, "payoutUpdate")]);
  for (const userId of new Set(members.map((member) => member.userId))) {
    const idempotencyKey = `vendor-payout-${input.status.toLowerCase()}:${input.requestId}:${userId}`;
    const statusCopy = input.status === "PAID" ? "has been paid" : input.status === "APPROVED" ? "was approved" : `was rejected${input.reason ? `: ${input.reason}` : ""}`;
    await createSellerNotification(transaction, { userId, type: `vendor.payout.${input.status.toLowerCase()}`, title: `Payout ${input.status.toLowerCase()}`, body: `Your BDT ${notificationMoney(input.amountMinor)} payout request ${statusCopy}.`, data: { href: "/vendor/finance/payouts", payoutRequestId: input.requestId }, idempotencyKey, push });
  }
}

export async function notifyVendorReturnRequested(transaction: TransactionClient, input: { returnId: string; vendorId: string; orderNumber: string; reasonCode: string }) {
  const [members, push] = await Promise.all([transaction.vendorMember.findMany({ where: { vendorId: input.vendorId, status: "active", user: { status: "ACTIVE" } }, select: { userId: true } }), sellerPushEnabled(transaction, input.vendorId, "returnRequest")]);
  for (const userId of new Set(members.map((member) => member.userId))) {
    const idempotencyKey = `vendor-return-requested:${input.returnId}:${userId}`;
    await createSellerNotification(transaction, { userId, type: "vendor.return.requested", title: `Return requested for ${input.orderNumber}`, body: `A customer submitted a ${input.reasonCode.toLowerCase().replaceAll("_", " ")} return request that needs review.`, data: { href: `/vendor/returns/${input.returnId}`, returnId: input.returnId }, idempotencyKey, push });
  }
}

export class OperationsService {
  private readonly outbox = new OutboxRepository();
  constructor(private readonly client: PrismaClient, private readonly sslCommerz = new SslCommerzGateway()) {}

  private async deliverySettingsRow() { return this.client.deliverySetting.upsert({ where: { key: "default" }, create: {}, update: {} }); }
  private deliverySettingsDto(row: DeliverySetting) { return { key: "default" as const, standardChargeMinor: row.standardChargeMinor.toString(), freeDeliveryEnabled: row.freeDeliveryEnabled, freeDeliveryThresholdMinor: row.freeDeliveryThresholdMinor.toString(), baseLocation: { division: row.baseDivision, district: row.baseDistrict, upazila: row.baseUpazila, union: row.baseUnion }, zoneFees: { sameUnionMinor: row.sameUnionFeeMinor.toString(), sameUpazilaMinor: row.sameUpazilaFeeMinor.toString(), sameDistrictMinor: row.sameDistrictFeeMinor.toString(), outsideDistrictMinor: row.outsideDistrictFeeMinor.toString() }, serviceableZones: { sameUnion: row.sameUnionEnabled, sameUpazila: row.sameUpazilaEnabled, sameDistrict: row.sameDistrictEnabled, outsideDistrict: row.outsideDistrictEnabled }, inspectionPolicy: { openBoxAllowed: row.openBoxEnabled, inspectionMinutes: row.openBoxEnabled ? row.inspectionMinutes : 0 }, estimatedDays: { min: row.estimatedMinDays, max: row.estimatedMaxDays }, version: row.version }; }
  async deliverySettings() { return this.deliverySettingsDto(await this.deliverySettingsRow()); }
  private pickupPointDto(row: { id: string; name: string; phone: string; address: string; division: string; district: string; upazila: string; unionName: string; instructions: string | null; active: boolean; version: number }) { return { ...row }; }
  async pickupPoints() { const rows = await this.client.pickupPoint.findMany({ where: { active: true }, orderBy: [{ district: "asc" }, { upazila: "asc" }, { name: "asc" }] }); return rows.map((row) => this.pickupPointDto(row)); }
  async adminPickupPoints(session: Session) { requirePermission(session, "settings:manage"); const rows = await this.client.pickupPoint.findMany({ orderBy: [{ district: "asc" }, { upazila: "asc" }, { name: "asc" }] }); return rows.map((row) => this.pickupPointDto(row)); }
  async createPickupPoint(session: Session, input: PickupPointInput) { requirePermission(session, "settings:manage"); const row = await this.client.pickupPoint.create({ data: input }); await this.client.auditLog.create({ data: { actorUserId: session.principal.userId, actorType: "admin", action: "pickup_point.created", resourceType: "pickup_point", resourceId: row.id, after: json(this.pickupPointDto(row)) } }); return this.pickupPointDto(row); }
  async updatePickupPoint(session: Session, id: string, input: PickupPointUpdate) { requirePermission(session, "settings:manage"); const current = await this.client.pickupPoint.findUnique({ where: { id } }); if (!current) throw new ApiProblem(404, "PICKUP_POINT_NOT_FOUND", "Pickup point not found"); if (current.version !== input.expectedVersion) throw new ApiProblem(409, "PICKUP_POINT_VERSION_CONFLICT", "Pickup point changed; refresh and try again"); const { expectedVersion: _expectedVersion, ...data } = input; const updated = await this.client.pickupPoint.update({ where: { id, version: input.expectedVersion }, data: { ...data, version: { increment: 1 } } }); await this.client.auditLog.create({ data: { actorUserId: session.principal.userId, actorType: "admin", action: "pickup_point.updated", resourceType: "pickup_point", resourceId: id, before: json(this.pickupPointDto(current)), after: json(this.pickupPointDto(updated)) } }); return this.pickupPointDto(updated); }
  async serviceability(input: ServiceabilityInput) { const row = await this.deliverySettingsRow(); const same = (left: string, right: string) => left.trim().localeCompare(right.trim(), undefined, { sensitivity: "accent" }) === 0; const zone = same(input.union, row.baseUnion) && same(input.upazila, row.baseUpazila) && same(input.district, row.baseDistrict) ? "same_union" : same(input.upazila, row.baseUpazila) && same(input.district, row.baseDistrict) ? "same_upazila" : same(input.district, row.baseDistrict) ? "same_district" : "outside_district"; const zoneFee = zone === "same_union" ? row.sameUnionFeeMinor : zone === "same_upazila" ? row.sameUpazilaFeeMinor : zone === "same_district" ? row.sameDistrictFeeMinor : row.outsideDistrictFeeMinor; const serviceable = zone === "same_union" ? row.sameUnionEnabled : zone === "same_upazila" ? row.sameUpazilaEnabled : zone === "same_district" ? row.sameDistrictEnabled : row.outsideDistrictEnabled; const subtotal = BigInt(input.subtotalMinor); const freeDelivery = serviceable && row.freeDeliveryEnabled && subtotal >= row.freeDeliveryThresholdMinor; const charge = serviceable && !freeDelivery ? zoneFee : 0n; const remaining = serviceable && row.freeDeliveryEnabled && subtotal < row.freeDeliveryThresholdMinor ? row.freeDeliveryThresholdMinor - subtotal : 0n; return { serviceable, zone, charge: money(charge), freeDelivery, amountNeededForFreeDelivery: money(remaining), estimatedDays: { min: row.estimatedMinDays, max: row.estimatedMaxDays } }; }
  async updateDeliverySettings(session: Session, input: DeliverySettingsInput) { requirePermission(session, "settings:manage"); const current = await this.deliverySettingsRow(); if (current.version !== input.expectedVersion) throw new ApiProblem(409, "DELIVERY_SETTINGS_VERSION_CONFLICT", "Delivery settings changed; refresh and try again"); const updated = await this.client.deliverySetting.update({ where: { key: "default" }, data: { standardChargeMinor: BigInt(input.standardChargeMinor), freeDeliveryEnabled: input.freeDeliveryEnabled, freeDeliveryThresholdMinor: BigInt(input.freeDeliveryThresholdMinor), baseDivision: input.baseLocation.division, baseDistrict: input.baseLocation.district, baseUpazila: input.baseLocation.upazila, baseUnion: input.baseLocation.union, sameUnionFeeMinor: BigInt(input.zoneFees.sameUnionMinor), sameUpazilaFeeMinor: BigInt(input.zoneFees.sameUpazilaMinor), sameDistrictFeeMinor: BigInt(input.zoneFees.sameDistrictMinor), outsideDistrictFeeMinor: BigInt(input.zoneFees.outsideDistrictMinor), sameUnionEnabled: input.serviceableZones.sameUnion, sameUpazilaEnabled: input.serviceableZones.sameUpazila, sameDistrictEnabled: input.serviceableZones.sameDistrict, outsideDistrictEnabled: input.serviceableZones.outsideDistrict, openBoxEnabled: input.inspectionPolicy.openBoxAllowed, inspectionMinutes: input.inspectionPolicy.openBoxAllowed ? input.inspectionPolicy.inspectionMinutes : 0, estimatedMinDays: input.estimatedDays.min, estimatedMaxDays: input.estimatedDays.max, version: { increment: 1 } } }); await this.client.auditLog.create({ data: { actorUserId: session.principal.userId, actorType: "admin", action: "delivery.settings.updated", resourceType: "delivery_settings", resourceId: "default", before: json(this.deliverySettingsDto(current)), after: json(this.deliverySettingsDto(updated)) } }); return this.deliverySettingsDto(updated); }

  async cancelOrder(session: Session, orderId: string, input: CancelOrder, key: string, correlationId?: string) {
    const adminCancellation = session.permissions.includes("admin:manage");
    requirePermission(session, adminCancellation ? "orders:manage" : "orders:read");
    if (!adminCancellation && input.reasonCode === "ADMIN_OVERRIDE") throw new ApiProblem(400, "CANCELLATION_REASON_INVALID", "Administrative cancellation reason is not available to customers");
    const scope = `order-cancel:${session.principal.userId}:${orderId}`;
    return withSerializableTransaction(this.client, async (transaction) => {
      const prior = await replay(transaction, scope, key, input); if (prior.response) return prior.response;
      const order = await transaction.order.findFirst({ where: { id: orderId, ...(adminCancellation ? {} : { userId: session.principal.userId }) }, include: { vendorOrders: true, payments: { orderBy: { createdAt: "desc" }, take: 1 }, reservations: { where: { status: { in: ["ACTIVE", "CONSUMED"] } } } } });
      if (!order) throw new ApiProblem(404, "ORDER_NOT_FOUND", "Order not found");
      if (order.version !== input.expectedVersion) throw new ApiProblem(409, "ORDER_VERSION_CONFLICT", "Order changed; refresh and try again");
      const placedAt = order.placedAt ?? order.createdAt;
      const cancellationMinutes = (await loadBusinessRules(transaction)).rules.orders.customerCancellationMinutes;
      if (!adminCancellation && placedAt.getTime() + cancellationMinutes * 60_000 <= Date.now()) throw new ApiProblem(409, "ORDER_CANCELLATION_WINDOW_EXPIRED", `Orders can only be cancelled within ${cancellationMinutes} minutes of placement`);
      if (!["PENDING_PAYMENT", "CONFIRMED", "PROCESSING"].includes(order.status) || order.vendorOrders.some((item) => !["PLACED", "ACCEPTED", "PROCESSING"].includes(item.status))) throw new ApiProblem(409, "ORDER_CANCELLATION_NOT_ALLOWED", "Order can no longer be cancelled");
      await releaseOrderReservations(transaction, order.id, order.reservations);
      await transaction.vendorOrder.updateMany({ where: { orderId }, data: { status: "CANCELLED", version: { increment: 1 } } });
      const reasonCode = adminCancellation ? "ADMIN_OVERRIDE" : input.reasonCode;
      const recordedReason = `${reasonCode}: ${input.reason}`;
      await transaction.order.update({ where: { id: orderId }, data: { status: "CANCELLED", version: { increment: 1 }, statusEvents: { create: { fromStatus: order.status, toStatus: "CANCELLED", actorType: adminCancellation ? "admin" : "customer", actorId: session.principal.userId, reason: recordedReason } } } });
      const payment = order.payments[0];
      if (payment && ["CAPTURED", "PARTIALLY_REFUNDED"].includes(payment.status)) {
        const refundable = payment.amountMinor - payment.refundedMinor; assertRefundLimit(payment.amountMinor, payment.refundedMinor, refundable);
        await transaction.refund.create({ data: { orderId, paymentId: payment.id, amountMinor: refundable, currency: payment.currency, reason: `Cancellation ${recordedReason}` } });
      } else if (payment && !["FAILED", "CANCELLED", "EXPIRED", "REFUNDED"].includes(payment.status)) await transaction.payment.update({ where: { id: payment.id }, data: { status: "CANCELLED", version: { increment: 1 } } });
      await this.outbox.enqueue(transaction, { aggregateType: "order", aggregateId: orderId, eventType: "order.cancelled", idempotencyKey: `order-cancelled:${orderId}`, payload: { reasonCode, reason: input.reason } });
      await transaction.auditLog.create({ data: { actorUserId: session.principal.userId, actorType: adminCancellation ? "admin" : "customer", action: adminCancellation ? "order.admin_cancelled" : "order.cancelled", resourceType: "order", resourceId: orderId, ...(correlationId ? { correlationId } : {}), before: json({ status: order.status }), after: json({ status: "CANCELLED", reasonCode, reason: input.reason }) } });
      const result = { id: orderId, status: "CANCELLED", version: order.version + 1 }; await remember(transaction, scope, key, prior.hash, result); return result;
    });
  }

  async createReturn(session: Session, input: CreateReturn, key: string, correlationId?: string) {
    requirePermission(session, "returns:manage");
    const scope = `return-create:${session.principal.userId}:${input.vendorOrderId}`;
    return withSerializableTransaction(this.client, async (transaction) => {
      const prior = await replay(transaction, scope, key, input); if (prior.response) return prior.response;
      const vendorOrder = await transaction.vendorOrder.findFirst({ where: { id: input.vendorOrderId, status: "DELIVERED", order: { userId: session.principal.userId } }, include: { order: true, shipments: { select: { deliveredAt: true }, take: 1 }, items: { include: { product: { select: { categoryId: true } }, returnItems: { where: { returnRequest: { status: { notIn: ["REJECTED", "CLOSED"] } } } } } } } });
      if (!vendorOrder) throw new ApiProblem(409, "RETURN_NOT_ELIGIBLE", "Only your delivered order can be returned");
      const inheritedPolicies = await loadInheritedCategoryPolicies(transaction, vendorOrder.items.flatMap((item) => item.product?.categoryId ? [item.product.categoryId] : []));
      const selectedCategoryPolicies = input.items.map((requested) => { const categoryId = vendorOrder.items.find((candidate) => candidate.id === requested.orderItemId)?.product?.categoryId; return categoryId ? inheritedPolicies.get(categoryId) : undefined; });
      const policy = effectiveReturnPolicy(await loadReturnPolicy(transaction), selectedCategoryPolicies);
      assertReturnPolicy({ deadline: vendorOrder.order.returnWindowUntil, deliveredAt: vendorOrder.shipments[0]?.deliveredAt ?? null, evidenceCount: input.evidenceStorageKeys?.length ?? 0, policy, now: Date.now() });
      const evidenceStorageKeys = await validateCustomerReturnEvidence(transaction, session.principal.userId, input.evidenceStorageKeys);
      let requestedMinor = 0n; const items = input.items.map((requested) => {
        const item = vendorOrder.items.find((candidate) => candidate.id === requested.orderItemId); if (!item) throw new ApiProblem(400, "RETURN_ITEM_INVALID", "Return item does not belong to this vendor order");
        const alreadyRequested = item.returnItems.reduce((sum, row) => sum + row.quantity, 0); if (requested.quantity + alreadyRequested > item.quantity) throw new ApiProblem(409, "RETURN_QUANTITY_EXCEEDED", "Return quantity exceeds delivered quantity");
        const amount = (item.lineTotalMinor * BigInt(requested.quantity)) / BigInt(item.quantity); requestedMinor += amount; return { orderItemId: item.id, quantity: requested.quantity, requestedMinor: amount };
      });
      const created = await transaction.return.create({ data: { orderId: vendorOrder.orderId, vendorOrderId: vendorOrder.id, userId: session.principal.userId, reasonCode: input.reasonCode, reasonDetail: input.reasonDetail ?? null, refundMethod: input.refundMethod, requestedMinor, currency: vendorOrder.order.currency, items: { create: items }, events: { create: { toStatus: "REQUESTED", actorType: "customer", actorId: session.principal.userId, metadata: json({ evidenceStorageKeys }) } } }, include: { items: true } });
      await transaction.order.update({ where: { id: vendorOrder.orderId }, data: { status: "RETURN_REQUESTED", version: { increment: 1 } } });
      await notifyVendorReturnRequested(transaction, { returnId: created.id, vendorId: vendorOrder.vendorId, orderNumber: vendorOrder.order.orderNumber, reasonCode: input.reasonCode });
      await this.outbox.enqueue(transaction, { aggregateType: "return", aggregateId: created.id, eventType: "return.requested", idempotencyKey: `return-requested:${created.id}`, payload: { orderId: created.orderId, vendorOrderId: created.vendorOrderId } });
      await transaction.auditLog.create({ data: { actorUserId: session.principal.userId, actorType: "customer", action: "return.requested", resourceType: "return", resourceId: created.id, ...(correlationId ? { correlationId } : {}), after: json({ requestedMinor: requestedMinor.toString(), reasonCode: input.reasonCode }) } });
      const result = returnDto(created); await remember(transaction, scope, key, prior.hash, result); return result;
    });
  }

  async returns(session: Session, admin = false) {
    if (admin && elevated(session) && session.permissions.includes("finance:read")) requirePermission(session, "finance:read"); else requirePermission(session, "returns:manage");
    const rows = await this.client.return.findMany({ where: admin && elevated(session) ? {} : { userId: session.principal.userId }, include: { items: { include: { orderItem: { select: returnProductSelect } } }, events: { select: { id: true, fromStatus: true, toStatus: true, createdAt: true }, orderBy: [{ createdAt: "asc" }, { id: "asc" }] } }, orderBy: { createdAt: "desc" }, take: 100 });
    return rows.map((row) => ({ ...returnDto(row), items: returnDto(row).items.map((item, index) => ({ ...item, ...returnProductDetails(row.items[index]!.orderItem) })), refundMethod: row.refundMethod, events: row.events.map((event) => ({ id: event.id, fromStatus: event.fromStatus, toStatus: event.toStatus, createdAt: event.createdAt.toISOString() })) }));
  }

  async ownReturn(session: Session, id: string, vendor = false) {
    requirePermission(session, vendor ? "orders:read" : "returns:manage");
    const vendorId = session.principal.vendorIds[0];
    if (vendor && !vendorId) throw new ApiProblem(403, "VENDOR_REQUIRED", "Vendor membership is required");
    const row = await this.client.return.findFirst({ where: { id, ...(vendor ? { vendorOrder: { vendorId: vendorId! } } : { userId: session.principal.userId }) }, include: { items: { include: { orderItem: { select: returnProductSelect } } }, events: { select: { id: true, fromStatus: true, toStatus: true, createdAt: true }, orderBy: [{ createdAt: "asc" }, { id: "asc" }] } } });
    if (!row) throw new ApiProblem(404, "RETURN_NOT_FOUND", "Return not found");
    return { ...returnDto(row), items: returnDto(row).items.map((item, index) => ({ ...item, ...returnProductDetails(row.items[index]!.orderItem) })), refundMethod: row.refundMethod, events: row.events.map((event) => ({ id: event.id, fromStatus: event.fromStatus, toStatus: event.toStatus, createdAt: event.createdAt.toISOString() })) };
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
    return { ...returnDto(row), orderNumber: row.order.orderNumber, reasonDetail: row.reasonDetail, customer: { name: row.order.user?.profile?.displayName ?? "Guest customer", email: row.order.user?.normalizedEmail ?? null, phone: row.order.user?.normalizedPhone ?? null }, vendor: { name: row.vendorOrder.vendor.displayName, legalName: row.vendorOrder.vendor.legalName, shop: row.vendorOrder.shop.name }, items: row.items.map((item) => ({ id: item.id, orderItemId: item.orderItemId, name: item.orderItem.productNameSnapshot, sku: item.orderItem.skuSnapshot, quantity: item.quantity, requestedAmount: money(item.requestedMinor, row.currency), unitPrice: money(item.orderItem.unitPriceMinor, row.currency), lineTotal: money(item.orderItem.lineTotalMinor, row.currency), inspection: item.inspection as Record<string, unknown> | null })), events: row.events.map((event) => ({ id: event.id, fromStatus: event.fromStatus, toStatus: event.toStatus, actorType: event.actorType, note: event.note, metadata: event.metadata, createdAt: event.createdAt.toISOString() })), refunds: row.refunds.map((refund) => ({ id: refund.id, status: refund.status, amount: money(refund.amountMinor, refund.currency), providerRefundId: refund.providerRefundId, reason: refund.reason, createdAt: refund.createdAt.toISOString(), completedAt: refund.completedAt?.toISOString() ?? null })) };
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
      if (["PICKUP_SCHEDULED", "RECEIVED", "INSPECTED"].includes(input.status)) throw new ApiProblem(409, "RETURN_LOGISTICS_ACTION_REQUIRED", "Use the reverse logistics workflow for pickup, receipt, and inspection");
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
      const refund = current.refunds[0]!; const payment = await transaction.payment.findUniqueOrThrow({ where: { id: refund.paymentId }, include: { attempts: { orderBy: { attemptNumber: "desc" }, take: 1 } } }); const { rules } = await loadBusinessRules(transaction); assertRefundLimit(payment.amountMinor, payment.refundedMinor, refund.amountMinor); const remainingMinor = payment.amountMinor - payment.refundedMinor; if (!rules.refunds.allowPartial && refund.amountMinor !== remainingMinor) throw new ApiProblem(409, "PARTIAL_REFUND_DISABLED", "Platform policy requires refunding the full remaining captured amount"); if (rules.refunds.requireProviderReference && !providerReferenceValid(payment, input.providerRefundId)) { const rule = refundProviderRule(payment); throw new ApiProblem(409, "REFUND_PROVIDER_REFERENCE_REQUIRED", rule.reason); } const refundedMinor = payment.refundedMinor + refund.amountMinor;
      await assertRefundAccountingHistory(transaction, current.orderId);
      await verifySslRefund(this.sslCommerz, payment, input.providerRefundId);
      await transaction.refund.update({ where: { id: refund.id }, data: { status: "completed", providerRefundId: input.providerRefundId ?? null, completedAt: new Date() } });
      await transaction.payment.update({ where: { id: payment.id }, data: { refundedMinor, status: refundedMinor === payment.amountMinor ? "REFUNDED" : "PARTIALLY_REFUNDED", version: { increment: 1 } } });
      await transaction.return.update({ where: { id: returnId }, data: { status: "REFUNDED", version: { increment: 1 }, events: { create: { fromStatus: "REFUND_PENDING", toStatus: "REFUNDED", actorType: "admin", actorId: session.principal.userId } } } });
      const vendorOrder = await transaction.vendorOrder.findUniqueOrThrow({ where: { id: current.vendorOrderId } });
      await reverseSellerSettlement(transaction, { packageId: vendorOrder.id, packageTotalMinor: vendorOrder.totalMinor, refundId: refund.id, amountMinor: refund.amountMinor, currency: refund.currency });
      await transaction.financialLedgerEntry.create({ data: { accountType: "customer_refund", accountId: current.userId, direction: "DEBIT", amountMinor: refund.amountMinor, entryType: "RETURN_REFUND", referenceType: "return", referenceId: returnId, idempotencyKey: `financial-return-refund:${returnId}` } });
      await reverseLoyaltyForRefund(transaction, current.orderId, refund.id, refund.amountMinor, payment.amountMinor); await this.outbox.enqueue(transaction, { aggregateType: "refund", aggregateId: refund.id, eventType: "refund.completed", idempotencyKey: `refund-completed:${refund.id}`, payload: { returnId, paymentId: payment.id, amountMinor: refund.amountMinor.toString() } }); await transaction.auditLog.create({ data: { actorUserId: session.principal.userId, actorType: "admin", action: "refund.completed", resourceType: "return", resourceId: returnId, after: json({ refundId: refund.id, amountMinor: refund.amountMinor.toString(), providerRefundId: input.providerRefundId }) } });
      const result = { returnId, refundId: refund.id, status: "REFUNDED", amount: money(refund.amountMinor, refund.currency) }; await remember(transaction, scope, key, prior.hash, result); return result;
    });
  }

  async packageCancellationRefunds(session: Session) {
    requirePermission(session, "finance:manage"); if (!elevated(session)) throw new ApiProblem(403, "ADMIN_REQUIRED", "Finance admin access is required");
    const rows = await this.client.refund.findMany({ where: { vendorOrderId: { not: null }, returnId: null, status: "pending" }, include: { order: { select: { orderNumber: true } }, payment: { select: { provider: true, method: true, status: true, refundedMinor: true, currency: true } }, vendorOrder: { include: { shop: { select: { name: true } }, vendor: { select: { displayName: true } } } } }, orderBy: { createdAt: "asc" }, take: 100 });
    return rows.map((row) => ({ refundId: row.id, orderId: row.orderId, orderNumber: row.order.orderNumber, vendorOrderId: row.vendorOrderId!, shopName: row.vendorOrder!.shop.name, vendorName: row.vendorOrder!.vendor.displayName, reason: row.reason, status: row.status, amount: money(row.amountMinor, row.currency), payment: { provider: row.payment.provider, method: row.payment.method, status: row.payment.status, refunded: money(row.payment.refundedMinor, row.payment.currency) }, createdAt: row.createdAt.toISOString() }));
  }

  async completePackageCancellationRefund(session: Session, refundId: string, input: CompleteRefund, key: string) {
    requirePermission(session, "finance:manage"); if (!elevated(session)) throw new ApiProblem(403, "ADMIN_REQUIRED", "Finance admin access is required"); const scope = `package-refund-complete:${refundId}`;
    return withSerializableTransaction(this.client, async (transaction) => {
      const prior = await replay(transaction, scope, key, input); if (prior.response) return prior.response;
      const refund = await transaction.refund.findUnique({ where: { id: refundId }, include: { order: true, payment: { include: { attempts: { orderBy: { attemptNumber: "desc" }, take: 1 } } }, vendorOrder: true } });
      if (!refund || !refund.vendorOrderId || refund.returnId) throw new ApiProblem(404, "PACKAGE_REFUND_NOT_FOUND", "Package cancellation refund not found");
      if (refund.status !== "pending") throw new ApiProblem(409, "PACKAGE_REFUND_NOT_PENDING", "Package cancellation refund is not pending");
      const { rules } = await loadBusinessRules(transaction);
      if (rules.refunds.requireProviderReference && !providerReferenceValid(refund.payment, input.providerRefundId)) { const rule = refundProviderRule(refund.payment); throw new ApiProblem(409, "REFUND_PROVIDER_REFERENCE_REQUIRED", rule.reason); }
      assertRefundLimit(refund.payment.amountMinor, refund.payment.refundedMinor, refund.amountMinor);
      await assertRefundAccountingHistory(transaction, refund.orderId);
      await verifySslRefund(this.sslCommerz, refund.payment, input.providerRefundId);
      const refundedTotal = refund.payment.refundedMinor + refund.amountMinor;
      const paymentChanged = await transaction.payment.updateMany({ where: { id: refund.paymentId, version: refund.payment.version }, data: { refundedMinor: refundedTotal, status: refundedTotal === refund.payment.amountMinor ? "REFUNDED" : "PARTIALLY_REFUNDED", version: { increment: 1 } } });
      if (!paymentChanged.count) throw new ApiProblem(409, "PAYMENT_VERSION_CONFLICT", "Payment changed; refresh the refund queue");
      await transaction.refund.update({ where: { id: refund.id }, data: { status: "completed", providerRefundId: input.providerRefundId ?? null, completedAt: new Date() } });
      await reverseSellerSettlement(transaction, { packageId: refund.vendorOrderId, packageTotalMinor: refund.vendorOrder!.totalMinor, refundId: refund.id, amountMinor: refund.amountMinor, currency: refund.currency });
      await transaction.financialLedgerEntry.create({ data: { accountType: "customer_refund", accountId: refund.order.userId ?? refund.orderId, direction: "DEBIT", amountMinor: refund.amountMinor, currency: refund.currency, entryType: "PACKAGE_CANCELLATION_REFUND", referenceType: "refund", referenceId: refund.id, idempotencyKey: `financial-package-refund:${refund.id}` } });
      await reverseLoyaltyForRefund(transaction, refund.orderId, refund.id, refund.amountMinor, refund.payment.amountMinor);
      if (refundedTotal === refund.payment.amountMinor) {
        await transaction.order.update({ where: { id: refund.orderId }, data: { status: "REFUNDED", version: { increment: 1 } } });
        await transaction.orderStatusEvent.create({ data: { orderId: refund.orderId, fromStatus: refund.order.status, toStatus: "REFUNDED", actorType: "admin", actorId: session.principal.userId, reason: refund.reason } });
      }
      await this.outbox.enqueue(transaction, { aggregateType: "refund", aggregateId: refund.id, eventType: "refund.completed", idempotencyKey: `package-refund-completed:${refund.id}`, payload: { orderId: refund.orderId, vendorOrderId: refund.vendorOrderId, paymentId: refund.paymentId, amountMinor: refund.amountMinor.toString() } });
      await transaction.auditLog.create({ data: { actorUserId: session.principal.userId, actorType: "admin", action: "package_cancellation.refund.completed", resourceType: "refund", resourceId: refund.id, before: json({ status: "pending" }), after: json({ status: "completed", providerRefundId: input.providerRefundId, amountMinor: refund.amountMinor.toString() }) } });
      const result = { refundId: refund.id, orderId: refund.orderId, vendorOrderId: refund.vendorOrderId, status: "completed" as const, amount: money(refund.amountMinor, refund.currency), refundedTotal: money(refundedTotal, refund.currency) };
      await remember(transaction, scope, key, prior.hash, result); return result;
    });
  }

  async forceOrderRefund(session: Session, orderId: string, input: AdminOrderRefundInput, key: string) {
    requirePermission(session, "finance:manage"); if (!elevated(session)) throw new ApiProblem(403, "ADMIN_REQUIRED", "Finance admin access is required"); const scope = `order-refund:${orderId}`;
    return withSerializableTransaction(this.client, async (transaction) => {
      const prior = await replay(transaction, scope, key, input); if (prior.response) return prior.response;
      const order = await transaction.order.findUnique({ where: { id: orderId }, include: { payments: { where: { status: { in: ["CAPTURED", "PARTIALLY_REFUNDED"] } }, orderBy: { createdAt: "desc" }, take: 1, include: { attempts: { orderBy: { attemptNumber: "desc" }, take: 1 } } }, vendorOrders: true } }); if (!order) throw new ApiProblem(404, "ORDER_NOT_FOUND", "Order not found"); if (order.version !== input.expectedVersion) throw new ApiProblem(409, "ORDER_VERSION_CONFLICT", "Order changed; refresh and try again"); const payment = order.payments[0]; if (!payment) throw new ApiProblem(409, "REFUND_PAYMENT_UNAVAILABLE", "A captured payment is required"); const { rules } = await loadBusinessRules(transaction); if (rules.refunds.requireProviderReference && !providerReferenceValid(payment, input.providerRefundId)) { const rule = refundProviderRule(payment); throw new ApiProblem(409, "REFUND_PROVIDER_REFERENCE_REQUIRED", rule.reason); } if (!order.vendorOrders.length) throw new ApiProblem(409, "REFUND_SELLER_ALLOCATION_UNAVAILABLE", "Seller fulfillment allocation is required"); const amount = BigInt(input.amountMinor); assertRefundLimit(payment.amountMinor, payment.refundedMinor, amount); const remainingMinor = payment.amountMinor - payment.refundedMinor; if (!rules.refunds.allowPartial && amount !== remainingMinor) throw new ApiProblem(409, "PARTIAL_REFUND_DISABLED", "Platform policy requires refunding the full remaining captured amount"); const refundedTotal = payment.refundedMinor + amount; const full = refundedTotal === payment.amountMinor;
      await verifySslRefund(this.sslCommerz, payment, input.providerRefundId);
      const changed = await transaction.order.updateMany({ where: { id: orderId, version: input.expectedVersion }, data: { ...(full ? { status: "REFUNDED" as const } : {}), version: { increment: 1 } } }); if (!changed.count) throw new ApiProblem(409, "ORDER_VERSION_CONFLICT", "Order changed; refresh and try again"); const paymentChanged = await transaction.payment.updateMany({ where: { id: payment.id, version: payment.version }, data: { refundedMinor: refundedTotal, status: full ? "REFUNDED" : "PARTIALLY_REFUNDED", version: { increment: 1 } } }); if (!paymentChanged.count) throw new ApiProblem(409, "PAYMENT_VERSION_CONFLICT", "Payment changed; refresh and try again");
      const refund = await transaction.refund.create({ data: { orderId, paymentId: payment.id, amountMinor: amount, currency: payment.currency, status: "completed", providerRefundId: input.providerRefundId ?? null, reason: input.reason, completedAt: new Date() } });
      const allocations = await allocateOrderRefund(transaction, order.vendorOrders, amount, payment.currency);
      await assertRefundAccountingHistory(transaction, orderId);
      for (const allocation of allocations) {
        const vendorOrder = order.vendorOrders.find((item) => item.id === allocation.id)!;
        await reverseSellerSettlement(transaction, { packageId: vendorOrder.id, packageTotalMinor: vendorOrder.totalMinor, refundId: refund.id, amountMinor: allocation.amountMinor, currency: payment.currency });
      }
      const platformShare = amount - allocations.reduce((total, allocation) => total + allocation.amountMinor, 0n);
      if (platformShare > 0n) await transaction.financialLedgerEntry.create({ data: { accountType: "platform_refund_allocation", accountId: orderId, direction: "DEBIT", amountMinor: platformShare, currency: payment.currency, entryType: "REFUND_ALLOCATION", referenceType: "refund", referenceId: refund.id, idempotencyKey: `platform-refund-allocation:${refund.id}` } });
      await transaction.financialLedgerEntry.create({ data: { accountType: "customer_refund", accountId: order.userId ?? orderId, direction: "DEBIT", amountMinor: amount, currency: payment.currency, entryType: "ADMIN_ORDER_REFUND", referenceType: "refund", referenceId: refund.id, idempotencyKey: `financial-admin-order-refund:${refund.id}` } }); await reverseLoyaltyForRefund(transaction, orderId, refund.id, amount, payment.amountMinor); if (full) await transaction.orderStatusEvent.create({ data: { orderId, fromStatus: order.status, toStatus: "REFUNDED", actorType: "admin", actorId: session.principal.userId, reason: input.reason } }); await this.outbox.enqueue(transaction, { aggregateType: "refund", aggregateId: refund.id, eventType: "refund.completed", idempotencyKey: `admin-order-refund-completed:${refund.id}`, payload: { orderId, paymentId: payment.id, amountMinor: amount.toString() } }); await transaction.auditLog.create({ data: { actorUserId: session.principal.userId, actorType: "admin", action: "order.refund_forced", resourceType: "order", resourceId: orderId, before: json({ status: order.status, refundedMinor: payment.refundedMinor.toString() }), after: json({ ...input, refundId: refund.id, refundedTotal: refundedTotal.toString() }) } }); const result = { orderId, refundId: refund.id, status: full ? "REFUNDED" as const : "PARTIALLY_REFUNDED" as const, amount: money(amount, payment.currency), refundedTotal: money(refundedTotal, payment.currency) }; await remember(transaction, scope, key, prior.hash, result); return result;
    });
  }

  async initiateProviderOrderRefund(session: Session, orderId: string, input: ProviderOrderRefundInput, key: string) {
    requirePermission(session, "finance:manage"); if (!elevated(session)) throw new ApiProblem(403, "ADMIN_REQUIRED", "Finance admin access is required"); const order = await this.client.order.findUnique({ where: { id: orderId }, include: { payments: { where: { provider: "sslcommerz", status: { in: ["CAPTURED", "PARTIALLY_REFUNDED"] } }, include: { attempts: { orderBy: { attemptNumber: "desc" }, take: 1 } }, orderBy: { createdAt: "desc" }, take: 1 } } }); if (!order) throw new ApiProblem(404, "ORDER_NOT_FOUND", "Order not found"); if (order.version !== input.expectedVersion) throw new ApiProblem(409, "ORDER_VERSION_CONFLICT", "Order changed; refresh and try again"); const payment = order.payments[0]; if (!payment) throw new ApiProblem(409, "SSLCOMMERZ_REFUND_PAYMENT_UNAVAILABLE", "A captured SSLCommerz payment is required"); const response = payment.attempts[0]?.responseSnapshot as { bankTransactionId?: string | null } | null; if (!response?.bankTransactionId) throw new ApiProblem(409, "SSLCOMMERZ_BANK_TRANSACTION_MISSING", "The validated SSLCommerz bank transaction ID is missing; reconcile the payment before refunding"); await assertRefundAccountingHistory(this.client, orderId); assertRefundLimit(payment.amountMinor, payment.refundedMinor, BigInt(input.amountMinor)); const { rules } = await loadBusinessRules(this.client); if (!rules.refunds.allowPartial && BigInt(input.amountMinor) !== payment.amountMinor - payment.refundedMinor) throw new ApiProblem(409, "PARTIAL_REFUND_DISABLED", "Platform policy requires a full refund"); const initiated = await initiateRefundOnce(this.client, this.sslCommerz, { orderId, expectedVersion: input.expectedVersion, bankTransactionId: response.bankTransactionId, amountMinor: BigInt(input.amountMinor), reason: input.reason }); return this.forceOrderRefund(session, orderId, { ...input, providerRefundId: initiated.refundRefId }, key);
  }

  async finance(session: Session, vendorId?: string) {
    requirePermission(session, "finance:read"); const selected = vendorId ?? session.principal.vendorIds[0]; if (!selected || (!elevated(session) && !session.principal.vendorIds.includes(selected))) throw new ApiProblem(403, "VENDOR_FINANCE_FORBIDDEN", "Vendor finance access is not allowed");
    const [current, requests, { rules }] = await Promise.all([this.client.vendorWallet.findUnique({ where: { vendorId: selected } }), this.client.vendorPayoutRequest.findMany({ where: { vendorId: selected }, orderBy: { requestedAt: "desc" }, take: 100 }), loadBusinessRules(this.client)]); const entries = current ? await this.client.vendorLedgerEntry.findMany({ where: { walletId: current.id }, orderBy: { createdAt: "desc" }, take: 100 }) : []; const totals = current ? await this.client.vendorLedgerEntry.groupBy({ by: ["direction"], where: { walletId: current.id }, _sum: { amountMinor: true } }) : [];
    const balance = totals.reduce((sum, row) => sum + (row.direction === "CREDIT" ? row._sum.amountMinor ?? 0n : -(row._sum.amountMinor ?? 0n)), 0n); return { vendorId: selected, balance: money(balance, current?.currency), payoutPolicy: { minimum: money(rules.settlement.minimumPayoutMinor, current?.currency), holdDays: rules.settlement.holdDays, cadenceDays: rules.settlement.cadenceDays }, entries: entries.map((entry) => ({ id: entry.id, direction: entry.direction, amount: money(entry.amountMinor, entry.currency), entryType: entry.entryType, referenceType: entry.referenceType, referenceId: entry.referenceId, createdAt: entry.createdAt.toISOString() })), payoutRequests: requests.map((request) => ({ id: request.id, bankAccountId: request.bankAccountId, amount: money(request.amountMinor, request.currency), status: request.status, requestedAt: request.requestedAt.toISOString(), version: request.version })) };
  }

  async requestPayout(session: Session, input: CreatePayoutRequest, key: string, correlationId?: string) {
    requirePermission(session, "finance:manage"); const vendorId = session.principal.vendorIds[0]; if (!vendorId) throw new ApiProblem(403, "VENDOR_REQUIRED", "Vendor membership is required"); const scope = `payout-request:${vendorId}`;
    return withSerializableTransaction(this.client, async (transaction) => {
      const prior = await replay(transaction, scope, key, input); if (prior.response) return prior.response;
      const bank = await transaction.vendorBankAccount.findFirst({ where: { id: input.bankAccountId, vendorId, verifiedAt: { not: null } } }); if (!bank) throw new ApiProblem(409, "PAYOUT_ACCOUNT_UNVERIFIED", "A verified vendor bank account is required");
      const current = await wallet(transaction, vendorId); const amount = BigInt(input.amountMinor); const { rules } = await loadBusinessRules(transaction); if (amount < rules.settlement.minimumPayoutMinor) throw new ApiProblem(409, "PAYOUT_BELOW_MINIMUM", `Payout amount is below the BDT ${(Number(rules.settlement.minimumPayoutMinor) / 100).toLocaleString("en-BD")} minimum settlement threshold`); try { assertAvailableBalance(calculateLedgerBalance(current.entries), amount); } catch { throw new ApiProblem(409, "PAYOUT_BALANCE_INSUFFICIENT", "Payout exceeds available balance"); }
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
      await notifyVendorPayoutStatus(transaction, { requestId: id, vendorId: current.vendorId, amountMinor: current.amountMinor, status, reason: input.reason ?? null });
      await transaction.auditLog.create({ data: { actorUserId: session.principal.userId, actorType: "admin", action: `payout.${status.toLowerCase()}`, resourceType: "payout_request", resourceId: id, before: json({ status: current.status }), after: json({ status, reason: input.reason }) } }); const result = { id, status, version: current.version + 1 }; await remember(transaction, scope, key, prior.hash, result); return result;
    });
  }

  async completePayout(session: Session, id: string, input: CompletePayout, key: string) {
    requirePermission(session, "finance:manage"); if (!elevated(session)) throw new ApiProblem(403, "ADMIN_REQUIRED", "Finance admin access is required"); const scope = `payout-complete:${id}`;
    return withSerializableTransaction(this.client, async (transaction) => {
      const prior = await replay(transaction, scope, key, input); if (prior.response) return prior.response; const current = await transaction.vendorPayoutRequest.findUnique({ where: { id }, include: { bankAccount: { select: { verifiedAt: true } } } }); if (!current) throw new ApiProblem(404, "PAYOUT_NOT_FOUND", "Payout request not found"); const { rules } = await loadBusinessRules(transaction); const settlement = settlementDecision({ amountMinor: current.amountMinor, status: current.status, provider: input.provider, providerRef: input.providerRef, bankAccountVerified: Boolean(current.bankAccount.verifiedAt) }, rules.settlement.minimumPayoutMinor); if (!settlement.eligible) throw new ApiProblem(409, settlement.code, settlement.reason);
      const payout = await transaction.vendorPayout.create({ data: { vendorId: current.vendorId, requestId: id, provider: input.provider, providerRef: input.providerRef, amountMinor: current.amountMinor, currency: current.currency, status: "PAID", paidAt: new Date() } }); await transaction.vendorPayoutRequest.update({ where: { id }, data: { status: "PAID", version: { increment: 1 } } });
      await notifyVendorPayoutStatus(transaction, { requestId: id, vendorId: current.vendorId, amountMinor: current.amountMinor, status: "PAID" });
      await this.outbox.enqueue(transaction, { aggregateType: "payout", aggregateId: payout.id, eventType: "payout.paid", idempotencyKey: `payout-paid:${id}`, payload: { requestId: id, vendorId: current.vendorId } }); await transaction.auditLog.create({ data: { actorUserId: session.principal.userId, actorType: "admin", action: "payout.paid", resourceType: "payout_request", resourceId: id, after: json({ provider: input.provider, providerRef: input.providerRef }) } }); const result = { id, payoutId: payout.id, status: "PAID" }; await remember(transaction, scope, key, prior.hash, result); return result;
    });
  }

  async settlementProposals(session: Session) {
    requirePermission(session, "finance:read"); if (!elevated(session)) throw new ApiProblem(403, "ADMIN_REQUIRED", "Finance admin access is required");
    const rows = await this.client.settlement.findMany({ where: { provider: "internal_proposal" }, orderBy: { createdAt: "desc" }, take: 100 });
    return rows.map((row) => ({ id: row.id, providerRef: row.providerRef, amount: money(row.amountMinor, row.currency), status: row.status, periodStart: row.periodStart.toISOString(), periodEnd: row.periodEnd.toISOString(), payload: row.payload, createdAt: row.createdAt.toISOString() }));
  }

  async createSettlementProposal(session: Session, input: CreateSettlementProposal, key: string) {
    requirePermission(session, "finance:manage"); if (!elevated(session)) throw new ApiProblem(403, "ADMIN_REQUIRED", "Finance admin access is required"); const scope = "settlement-proposal";
    return withSerializableTransaction(this.client, async (transaction) => {
      const prior = await replay(transaction, scope, key, input); if (prior.response) return prior.response; const { rules } = await loadBusinessRules(transaction); if (!rules.settlement.automaticProposal) throw new ApiProblem(409, "SETTLEMENT_PROPOSAL_DISABLED", "Automatic settlement proposals are disabled in platform settings");
      const periodEnd = input.periodEnd ? new Date(input.periodEnd) : new Date(); const periodStart = input.periodStart ? new Date(input.periodStart) : new Date(periodEnd.getTime() - rules.settlement.cadenceDays * 86_400_000);
      const requests = await transaction.vendorPayoutRequest.findMany({ where: { status: "APPROVED", ...(input.payoutRequestIds.length ? { id: { in: input.payoutRequestIds } } : {}), reviewedAt: { gte: periodStart, lte: periodEnd } }, include: { bankAccount: { select: { verifiedAt: true, provider: true, accountNumberMasked: true } }, vendor: { select: { displayName: true } } }, orderBy: [{ vendorId: "asc" }, { requestedAt: "asc" }] });
      const eligible = requests.filter((request) => settlementProposalDecision({ amountMinor: request.amountMinor, status: request.status, bankAccountVerified: Boolean(request.bankAccount.verifiedAt), reviewedAt: request.reviewedAt }, rules.settlement.minimumPayoutMinor, rules.settlement.holdDays, periodEnd).eligible);
      if (!eligible.length) throw new ApiProblem(409, "SETTLEMENT_PROPOSAL_EMPTY", "No approved payouts satisfy the configured amount, account and hold rules");
      const amountMinor = eligible.reduce((sum, request) => sum + request.amountMinor, 0n); const providerRef = `proposal-${randomUUID()}`; const settlement = await transaction.settlement.create({ data: { provider: "internal_proposal", providerRef, amountMinor, status: "PROPOSED", periodStart, periodEnd, payload: json({ payoutRequestIds: eligible.map((request) => request.id), vendors: eligible.map((request) => ({ id: request.vendorId, name: request.vendor.displayName, amountMinor: request.amountMinor.toString(), account: request.bankAccount.accountNumberMasked, provider: request.bankAccount.provider })) }) } });
      const changed = await transaction.vendorPayoutRequest.updateMany({ where: { id: { in: eligible.map((request) => request.id) }, status: "APPROVED" }, data: { status: "PROCESSING", version: { increment: 1 } } }); if (changed.count !== eligible.length) throw new ApiProblem(409, "SETTLEMENT_PROPOSAL_CONFLICT", "One or more payout requests changed during proposal creation");
      await transaction.auditLog.create({ data: { actorUserId: session.principal.userId, actorType: "admin", action: "settlement.proposal.created", resourceType: "settlement", resourceId: settlement.id, after: json({ providerRef, amountMinor: amountMinor.toString(), payoutRequestIds: eligible.map((request) => request.id) }) } }); const result = { id: settlement.id, providerRef, amount: money(amountMinor), status: settlement.status, payoutCount: eligible.length, periodStart: periodStart.toISOString(), periodEnd: periodEnd.toISOString() }; await remember(transaction, scope, key, prior.hash, result); return result;
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
