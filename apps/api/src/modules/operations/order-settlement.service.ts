import type { PrismaClient } from "@prisma/client";
import { approveOrderSettlementSchema, type Session } from "@amiyo/contracts";
import { withSerializableTransaction } from "../../infrastructure/database/transaction.js";
import { ApiProblem } from "../../middleware/api-problem.js";
import { loadBusinessRules } from "../admin/business-rules-config.js";

export class OrderSettlementService {
  constructor(private readonly client: PrismaClient) {}

  async approve(session: Session, vendorOrderId: string, input: unknown) {
    if (session.status !== "ACTIVE" || !session.permissions.includes("finance:manage") || !session.principal.roles.some((role) => role === "SUPER_ADMIN" || role === "FINANCE_ADMIN")) throw new ApiProblem(403, "SETTLEMENT_FORBIDDEN", "Finance administrator approval is required");
    const approval = approveOrderSettlementSchema.parse(input);
    return withSerializableTransaction(this.client, async (transaction) => {
      const key = `order-settlement:${vendorOrderId}`;
      const prior = await transaction.vendorLedgerEntry.findUnique({ where: { idempotencyKey: key } });
      if (prior) return { id: prior.id, amountMinor: prior.amountMinor.toString(), currency: prior.currency, alreadySettled: true };
      const current = await transaction.vendorOrder.findUnique({ where: { id: vendorOrderId }, include: { shipments: true, order: { include: { payments: { include: { codCollection: { include: { reconciliationItems: { include: { reconciliation: true } } } } } }, refunds: true, returns: true } } } });
      if (!current) throw new ApiProblem(404, "VENDOR_ORDER_NOT_FOUND", "Seller package not found");
      if (current.version !== approval.expectedVersion) throw new ApiProblem(409, "SETTLEMENT_VERSION_CONFLICT", "Package changed; refresh before approving");
      if (current.status !== "DELIVERED" || ["CANCELLED", "REFUNDED", "RETURNED"].includes(current.order.status)) throw new ApiProblem(409, "SETTLEMENT_NOT_DELIVERED", "Only delivered packages can be settled");
      if (current.order.refunds.length || current.order.returns.some((request) => request.status !== "REJECTED")) throw new ApiProblem(409, "SETTLEMENT_RECONCILIATION_REQUIRED", "Refund/return orders require finance reconciliation before settlement");
      const payment = current.order.payments.find((candidate) => candidate.status === "CAPTURED" && candidate.refundedMinor === 0n && candidate.currency === current.order.currency && candidate.amountMinor === current.order.totalMinor);
      if (!payment || (payment.method.toUpperCase() === "COD" && payment.codCollection?.collectedMinor !== payment.amountMinor)) throw new ApiProblem(409, "SETTLEMENT_PAYMENT_UNCONFIRMED", "Full captured payment and exact COD collection are required");
      if (payment.method.toUpperCase() === "COD" && !payment.codCollection?.reconciliationItems.some((item) => item.varianceMinor === 0n && item.reconciliation.status === "reconciled")) throw new ApiProblem(409, "SETTLEMENT_COD_NOT_REMITTED", "COD cash must be reconciled without variance before seller settlement");
      const { rules } = await loadBusinessRules(transaction);
      const deliveredAt = current.shipments.find((shipment) => shipment.status === "DELIVERED")?.deliveredAt;
      if (!deliveredAt || !current.order.returnWindowUntil) throw new ApiProblem(409, "SETTLEMENT_DATES_MISSING", "Confirmed delivery and return-window dates are required");
      const eligibleAt = Math.max(deliveredAt.getTime() + rules.settlement.holdDays * 86400000, current.order.returnWindowUntil.getTime());
      if (Date.now() < eligibleAt) throw new ApiProblem(409, "SETTLEMENT_HOLD_ACTIVE", `Settlement is held until ${new Date(eligibleAt).toISOString()}`);
      const shippingMinor = approval.shippingRecipient === "VENDOR" ? current.deliveryMinor : 0n;
      const amountMinor = current.subtotalMinor - current.discountMinor - current.commissionMinor + shippingMinor;
      if (current.subtotalMinor < current.discountMinor + current.commissionMinor) throw new ApiProblem(409, "SETTLEMENT_COMPONENTS_INVALID", "Discount and commission exceed merchandise proceeds; manual reconciliation is required");
      if (amountMinor <= 0n || current.order.currency !== "BDT") throw new ApiProblem(409, "SETTLEMENT_AMOUNT_INVALID", "A positive reconciled BDT seller amount is required");
      if (amountMinor !== BigInt(approval.expectedAmountMinor)) throw new ApiProblem(409, "SETTLEMENT_AMOUNT_CHANGED", "The approved amount does not match subtotal minus discount and commission plus approved shipping. Reconcile before approving.");
      const wallet = await transaction.vendorWallet.upsert({ where: { vendorId: current.vendorId }, create: { vendorId: current.vendorId, currency: "BDT" }, update: {} });
      if (wallet.currency !== "BDT") throw new ApiProblem(409, "SETTLEMENT_CURRENCY_MISMATCH", "Wallet currency does not match the order");
      const metadata = { orderId: current.orderId, vendorId: current.vendorId, approvedBy: session.principal.userId, reason: approval.reason, shippingRecipient: approval.shippingRecipient, shippingMinor: shippingMinor.toString(), commissionMinor: current.commissionMinor.toString(), discountMinor: current.discountMinor.toString(), subtotalMinor: current.subtotalMinor.toString(), holdDays: rules.settlement.holdDays };
      const entry = await transaction.vendorLedgerEntry.create({ data: { walletId: wallet.id, direction: "CREDIT", amountMinor, currency: "BDT", entryType: "ORDER_SETTLEMENT", referenceType: "vendor_order", referenceId: current.id, idempotencyKey: key, metadata } });
      await transaction.auditLog.create({ data: { actorUserId: session.principal.userId, actorType: "admin", action: "vendor_order.settlement_approved", resourceType: "vendor_order", resourceId: current.id, after: { ...metadata, ledgerEntryId: entry.id, amountMinor: amountMinor.toString() } } });
      return { id: entry.id, amountMinor: amountMinor.toString(), currency: "BDT", alreadySettled: false };
    });
  }
}
