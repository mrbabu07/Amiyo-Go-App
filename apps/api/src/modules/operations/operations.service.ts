import { createHash } from "node:crypto";
import { Prisma, type PrismaClient, type ReturnStatus } from "@prisma/client";
import type { CancelOrder, CodReconciliationInput, CompletePayout, CompleteRefund, CreatePayoutRequest, CreateReturn, ReturnTransition, ReviewPayout, Session } from "@amiyo/contracts";
import { assertAvailableBalance, assertRefundLimit, calculateLedgerBalance, canTransitionReturn } from "@amiyo/domain";
import { withSerializableTransaction, type TransactionClient } from "../../infrastructure/database/transaction.js";
import { ApiProblem } from "../../middleware/api-problem.js";
import { OutboxRepository } from "../outbox/outbox.repository.js";

const json = (value: unknown) => JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
const money = (amountMinor: bigint, currency = "BDT") => ({ amountMinor: amountMinor.toString(), currency });
const requestHash = (input: unknown) => createHash("sha256").update(JSON.stringify(input)).digest("hex");
const elevated = (session: Session) => session.principal.roles.some((role) => ["FINANCE_ADMIN", "OPERATIONS_ADMIN", "SUPER_ADMIN"].includes(role));

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

  async cancelOrder(session: Session, orderId: string, input: CancelOrder, key: string, correlationId?: string) {
    requirePermission(session, "orders:manage");
    const scope = `order-cancel:${session.principal.userId}:${orderId}`;
    return withSerializableTransaction(this.client, async (transaction) => {
      const prior = await replay(transaction, scope, key, input); if (prior.response) return prior.response;
      const order = await transaction.order.findFirst({ where: { id: orderId, userId: session.principal.userId }, include: { vendorOrders: true, payments: { orderBy: { createdAt: "desc" }, take: 1 }, reservations: { where: { status: "ACTIVE" } } } });
      if (!order) throw new ApiProblem(404, "ORDER_NOT_FOUND", "Order not found");
      if (order.version !== input.expectedVersion) throw new ApiProblem(409, "ORDER_VERSION_CONFLICT", "Order changed; refresh and try again");
      if (!["PENDING_PAYMENT", "CONFIRMED", "PROCESSING"].includes(order.status) || order.vendorOrders.some((item) => !["PLACED", "ACCEPTED", "PROCESSING"].includes(item.status))) throw new ApiProblem(409, "ORDER_CANCELLATION_NOT_ALLOWED", "Order can no longer be cancelled");
      for (const reservation of order.reservations) {
        const inventory = await transaction.inventoryItem.findUniqueOrThrow({ where: { variantId: reservation.variantId } });
        await transaction.inventoryItem.update({ where: { id: inventory.id }, data: { reserved: { decrement: reservation.quantity }, version: { increment: 1 }, movements: { create: { type: "RELEASE", quantity: reservation.quantity, referenceType: "order", referenceId: order.id, idempotencyKey: `cancel-release:${reservation.id}` } } } });
      }
      await transaction.inventoryReservation.updateMany({ where: { orderId, status: "ACTIVE" }, data: { status: "RELEASED" } });
      await transaction.vendorOrder.updateMany({ where: { orderId }, data: { status: "CANCELLED", version: { increment: 1 } } });
      await transaction.order.update({ where: { id: orderId }, data: { status: "CANCELLED", version: { increment: 1 }, statusEvents: { create: { fromStatus: order.status, toStatus: "CANCELLED", actorType: "customer", actorId: session.principal.userId, reason: input.reason } } } });
      const payment = order.payments[0];
      if (payment && ["CAPTURED", "PARTIALLY_REFUNDED"].includes(payment.status)) {
        const refundable = payment.amountMinor - payment.refundedMinor; assertRefundLimit(payment.amountMinor, payment.refundedMinor, refundable);
        await transaction.refund.create({ data: { orderId, paymentId: payment.id, amountMinor: refundable, currency: payment.currency, reason: `Cancellation: ${input.reason}` } });
      } else if (payment && !["FAILED", "CANCELLED", "EXPIRED", "REFUNDED"].includes(payment.status)) await transaction.payment.update({ where: { id: payment.id }, data: { status: "CANCELLED", version: { increment: 1 } } });
      await this.outbox.enqueue(transaction, { aggregateType: "order", aggregateId: orderId, eventType: "order.cancelled", idempotencyKey: `order-cancelled:${orderId}`, payload: { reason: input.reason } });
      await transaction.auditLog.create({ data: { actorUserId: session.principal.userId, actorType: "customer", action: "order.cancelled", resourceType: "order", resourceId: orderId, ...(correlationId ? { correlationId } : {}), before: json({ status: order.status }), after: json({ status: "CANCELLED", reason: input.reason }) } });
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

  async audit(session: Session) { requirePermission(session, "audit:read"); return this.client.auditLog.findMany({ where: { resourceType: { in: ["order", "return", "payout_request", "delivery_dispatch"] } }, orderBy: { createdAt: "desc" }, take: 100 }); }
}
