import type { Prisma } from "@prisma/client";
import { ApiProblem } from "../../middleware/api-problem.js";

type Package = { id: string; totalMinor: bigint };

export async function assertRefundAccountingHistory(transaction: Prisma.TransactionClient, orderId: string) {
  const refunds = await transaction.refund.findMany({ where: { orderId, status: "completed" }, select: { id: true, returnId: true } });
  if (!refunds.length) return;
  const legacy = await transaction.vendorLedgerEntry.findFirst({ where: { entryType: { in: ["RETURN_REFUND", "ADMIN_ORDER_REFUND"] }, OR: [{ referenceType: "refund", referenceId: { in: refunds.map((refund) => refund.id) } }, { referenceType: "return", referenceId: { in: refunds.flatMap((refund) => refund.returnId ? [refund.returnId] : []) } }] }, select: { id: true } });
  if (legacy) throw new ApiProblem(409, "REFUND_RECONCILIATION_REQUIRED", "Legacy gross seller debits require reconciliation before another refund");
}

export async function refundedPackageMinor(transaction: Prisma.TransactionClient, packageId: string, currency: string) {
  const total = await transaction.financialLedgerEntry.aggregate({ where: { accountType: "vendor_refund_allocation", accountId: packageId, currency, entryType: "REFUND_ALLOCATION" }, _sum: { amountMinor: true } });
  return total._sum.amountMinor ?? 0n;
}

export async function allocateOrderRefund(transaction: Prisma.TransactionClient, packages: Package[], amount: bigint, currency: string) {
  const ordered = [...packages].sort((left, right) => left.id.localeCompare(right.id));
  const capacities = await Promise.all(ordered.map(async (item) => {
    const used = await refundedPackageMinor(transaction, item.id, currency);
    if (used > item.totalMinor) throw new ApiProblem(409, "REFUND_RECONCILIATION_REQUIRED", "Historical seller refund allocation exceeds package total");
    return { ...item, remaining: item.totalMinor - used };
  }));
  const capacity = capacities.reduce((total, item) => total + item.remaining, 0n);
  let remainingAmount = amount < capacity ? amount : capacity;
  let remainingCapacity = capacity;
  return capacities.map((item) => {
    const share = remainingCapacity > 0n ? remainingAmount * item.remaining / remainingCapacity : 0n;
    remainingAmount -= share; remainingCapacity -= item.remaining;
    return { id: item.id, amountMinor: share };
  });
}

export async function reverseSellerSettlement(transaction: Prisma.TransactionClient, input: { packageId: string; packageTotalMinor: bigint; refundId: string; amountMinor: bigint; currency: string }) {
  if (input.amountMinor <= 0n) return;
  const key = `refund-allocation:${input.refundId}:${input.packageId}`;
  if (await transaction.financialLedgerEntry.findUnique({ where: { idempotencyKey: key } })) return;
  const prior = await refundedPackageMinor(transaction, input.packageId, input.currency);
  const cumulative = prior + input.amountMinor;
  if (input.packageTotalMinor <= 0n || cumulative > input.packageTotalMinor) throw new ApiProblem(409, "REFUND_RECONCILIATION_REQUIRED", "Refund allocation exceeds seller package value");
  const settlement = await transaction.vendorLedgerEntry.findUnique({ where: { idempotencyKey: `order-settlement:${input.packageId}` } });
  if (!settlement && await transaction.vendorLedgerEntry.findFirst({ where: { entryType: "ORDER_SETTLEMENT", referenceType: "vendor_order", referenceId: input.packageId }, select: { id: true } })) throw new ApiProblem(409, "REFUND_RECONCILIATION_REQUIRED", "Legacy settlement requires reconciliation before reversal");
  if (settlement) {
    if (settlement.currency !== input.currency || settlement.direction !== "CREDIT") throw new ApiProblem(409, "REFUND_RECONCILIATION_REQUIRED", "Settlement currency or direction is inconsistent");
    const metadata = settlement.metadata as { commissionMinor?: unknown; vendorId?: unknown; netBaseMinor?: unknown; commissionBaseMinor?: unknown } | null;
    if (typeof metadata?.commissionMinor !== "string" || !/^\d+$/.test(metadata.commissionMinor) || typeof metadata.vendorId !== "string") throw new ApiProblem(409, "REFUND_RECONCILIATION_REQUIRED", "Settlement commission snapshot is missing");
    const netBase = metadata.netBaseMinor ?? settlement.amountMinor.toString();
    const commissionBase = metadata.commissionBaseMinor ?? metadata.commissionMinor;
    if (typeof netBase !== "string" || !/^\d+$/.test(netBase) || typeof commissionBase !== "string" || !/^\d+$/.test(commissionBase)) throw new ApiProblem(409, "REFUND_RECONCILIATION_REQUIRED", "Settlement base snapshot is invalid");
    const sellerBase = BigInt(netBase);
    const debit = sellerBase * cumulative / input.packageTotalMinor - sellerBase * prior / input.packageTotalMinor;
    const commission = BigInt(commissionBase);
    const commissionReversal = commission * cumulative / input.packageTotalMinor - commission * prior / input.packageTotalMinor;
    if (debit > 0n) await transaction.vendorLedgerEntry.create({ data: { walletId: settlement.walletId, direction: "DEBIT", amountMinor: debit, currency: input.currency, entryType: "SETTLEMENT_REFUND", referenceType: "refund", referenceId: input.refundId, idempotencyKey: `settlement-refund:${input.refundId}:${input.packageId}`, metadata: { vendorOrderId: input.packageId, settlementEntryId: settlement.id, grossRefundMinor: input.amountMinor.toString(), commissionReversalMinor: commissionReversal.toString() } } });
    if (commissionReversal > 0n) await transaction.financialLedgerEntry.create({ data: { accountType: "platform_commission", accountId: metadata.vendorId, direction: "DEBIT", amountMinor: commissionReversal, currency: input.currency, entryType: "COMMISSION_REVERSAL", referenceType: "refund", referenceId: input.refundId, idempotencyKey: `commission-reversal:${input.refundId}:${input.packageId}` } });
  }
  await transaction.financialLedgerEntry.create({ data: { accountType: "vendor_refund_allocation", accountId: input.packageId, direction: "DEBIT", amountMinor: input.amountMinor, currency: input.currency, entryType: "REFUND_ALLOCATION", referenceType: "refund", referenceId: input.refundId, idempotencyKey: key } });
}
