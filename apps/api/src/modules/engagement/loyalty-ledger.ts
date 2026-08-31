import type { Prisma } from "@prisma/client";
import { loyaltyRefundReversal } from "@amiyo/domain";

const remainingReversal = (target: bigint, prior: bigint, maximum: bigint) => {
  const available = maximum - prior;
  if (available <= 0n) return 0n;
  const remaining = target - prior;
  if (remaining <= 0n) return 0n;
  return remaining > available ? available : remaining;
};

export async function expireLoyaltyBalance(transaction: Prisma.TransactionClient, userId: string, now = new Date()) {
  const account = await transaction.loyaltyAccount.findUnique({ where: { userId } });
  if (!account) return null;
  await transaction.$queryRaw`SELECT id FROM loyalty_accounts WHERE id = ${account.id}::uuid FOR UPDATE`;
  const transactions = await transaction.loyaltyTransaction.findMany({ where: { accountId: account.id }, orderBy: [{ createdAt: "asc" }, { id: "asc" }] });
  const lots = transactions.filter((entry) => entry.points > 0n && entry.expiresAt).map((entry) => ({ id: entry.id, expiresAt: entry.expiresAt!, remaining: entry.points }));
  let consumed = transactions.filter((entry) => entry.points < 0n && entry.entryType !== "POINTS_EXPIRED").reduce((sum, entry) => sum - entry.points, 0n);
  for (const lot of lots) { const used = consumed > lot.remaining ? lot.remaining : consumed; lot.remaining -= used; consumed -= used; if (consumed <= 0n) break; }
  const expiredByEarn = new Map(transactions.filter((entry) => entry.entryType === "POINTS_EXPIRED" && entry.points < 0n).map((entry) => [entry.referenceId, -entry.points]));
  let expiredTotal = 0n;
  for (const lot of lots) {
    if (lot.expiresAt > now) continue;
    const points = lot.remaining - (expiredByEarn.get(lot.id) ?? 0n);
    if (points <= 0n) continue;
    await transaction.loyaltyTransaction.create({ data: { accountId: account.id, points: -points, entryType: "POINTS_EXPIRED", referenceType: "loyalty_transaction", referenceId: lot.id, idempotencyKey: `points-expired:${lot.id}` } });
    expiredTotal += points;
  }
  if (expiredTotal > 0n) await transaction.loyaltyAccount.update({ where: { id: account.id }, data: { pointsBalance: { decrement: expiredTotal }, version: { increment: 1 } } });
  return transaction.loyaltyAccount.findUnique({ where: { id: account.id } });
}

export async function reverseLoyaltyForRefund(transaction: Prisma.TransactionClient, orderId: string, refundId: string, refundMinor: bigint, originalPaidMinor: bigint) {
  const order = await transaction.order.findUnique({ where: { id: orderId }, select: { userId: true } });
  if (!order?.userId) return;
  const account = await transaction.loyaltyAccount.findUnique({ where: { userId: order.userId } });
  if (!account) return;
  await transaction.$queryRaw`SELECT id FROM loyalty_accounts WHERE id = ${account.id}::uuid FOR UPDATE`;
  const [orderTransactions, completedRefunds] = await Promise.all([
    transaction.loyaltyTransaction.findMany({ where: { accountId: account.id, referenceType: "order", referenceId: orderId } }),
    transaction.refund.findMany({ where: { orderId, status: "completed" }, select: { id: true, amountMinor: true } })
  ]);
  const refundIds = completedRefunds.map((refund) => refund.id);
  const refundTransactions = refundIds.length ? await transaction.loyaltyTransaction.findMany({ where: { accountId: account.id, referenceType: "refund", referenceId: { in: refundIds } } }) : [];
  const earned = orderTransactions.filter((entry) => entry.entryType === "ORDER_EARNED" && entry.points > 0n).reduce((sum, entry) => sum + entry.points, 0n);
  const redeemed = orderTransactions.filter((entry) => entry.entryType === "ORDER_REDEMPTION" && entry.points < 0n).reduce((sum, entry) => sum - entry.points, 0n);
  const refundedMinor = completedRefunds.reduce((sum, refund) => sum + refund.amountMinor, 0n) || refundMinor;
  const priorEarnedReversal = refundTransactions.filter((entry) => entry.entryType === "REFUND_EARN_REVERSAL" && entry.referenceId !== refundId).reduce((sum, entry) => sum - entry.points, 0n);
  const priorRedeemedRestoration = refundTransactions.filter((entry) => entry.entryType === "REFUND_REDEMPTION_RESTORED" && entry.referenceId !== refundId).reduce((sum, entry) => sum + entry.points, 0n);
  const earnedReversal = remainingReversal(loyaltyRefundReversal(earned, refundedMinor, originalPaidMinor), priorEarnedReversal, earned);
  const redeemedRestoration = remainingReversal(loyaltyRefundReversal(redeemed, refundedMinor, originalPaidMinor), priorRedeemedRestoration, redeemed);
  if (earnedReversal > 0n) await transaction.loyaltyTransaction.create({ data: { accountId: account.id, points: -earnedReversal, entryType: "REFUND_EARN_REVERSAL", referenceType: "refund", referenceId: refundId, idempotencyKey: `loyalty-refund-earned:${refundId}` } });
  if (redeemedRestoration > 0n) await transaction.loyaltyTransaction.create({ data: { accountId: account.id, points: redeemedRestoration, entryType: "REFUND_REDEMPTION_RESTORED", referenceType: "refund", referenceId: refundId, idempotencyKey: `loyalty-refund-restoration:${refundId}` } });
  if (earnedReversal > 0n || redeemedRestoration > 0n) await transaction.loyaltyAccount.update({ where: { id: account.id }, data: { pointsBalance: { increment: redeemedRestoration - earnedReversal }, version: { increment: 1 } } });
}
