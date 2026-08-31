import { Prisma, type PrismaClient } from "@prisma/client";
import { loyaltyAwardJobSchema } from "@amiyo/contracts";
import { defaultLoyaltyPolicy, loyaltyExpiresAt, loyaltyPointsEarned, type LoyaltyPolicy } from "@amiyo/domain";

function policy(value: Prisma.JsonValue | null | undefined): LoyaltyPolicy {
  const root = value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}; const source = root.loyalty && typeof root.loyalty === "object" && !Array.isArray(root.loyalty) ? root.loyalty as Record<string, unknown> : {};
  return { enabled: typeof source.enabled === "boolean" ? source.enabled : defaultLoyaltyPolicy.enabled, earnAmountMinorPerPoint: BigInt(String(source.earnAmountMinorPerPoint ?? defaultLoyaltyPolicy.earnAmountMinorPerPoint)), redeemMinorPerPoint: BigInt(String(source.redeemMinorPerPoint ?? defaultLoyaltyPolicy.redeemMinorPerPoint)), minimumRedemptionPoints: BigInt(String(source.minimumRedemptionPoints ?? defaultLoyaltyPolicy.minimumRedemptionPoints)), maximumRedemptionBps: Number(source.maximumRedemptionBps ?? defaultLoyaltyPolicy.maximumRedemptionBps), fraudHoldDays: Number(source.fraudHoldDays ?? defaultLoyaltyPolicy.fraudHoldDays), expiryDays: Number(source.expiryDays ?? defaultLoyaltyPolicy.expiryDays) };
}

export function createLoyaltyProcessor(client: PrismaClient) {
  return async (job: { data: unknown }) => {
    const { orderId } = loyaltyAwardJobSchema.parse(job.data);
    return client.$transaction(async (transaction) => {
      const existing = await transaction.loyaltyTransaction.findUnique({ where: { idempotencyKey: `loyalty-earned:${orderId}` } }); if (existing) return { awarded: false, duplicate: true, points: existing.points.toString() };
      const order = await transaction.order.findUnique({ where: { id: orderId }, include: { payments: { orderBy: { createdAt: "desc" }, take: 1 } } }); if (!order?.userId || order.status !== "DELIVERED") return { awarded: false, duplicate: false, points: "0" };
      const configuration = await transaction.platformConfiguration.findUnique({ where: { key: "business-rules" } }); const currentPolicy = policy(configuration?.featureFlags); if (!currentPolicy.enabled) return { awarded: false, duplicate: false, points: "0" };
      const refunded = order.payments[0]?.refundedMinor ?? 0n; const merchandisePaid = order.totalMinor - order.deliveryMinor - refunded; const points = loyaltyPointsEarned(merchandisePaid > 0n ? merchandisePaid : 0n, currentPolicy); if (points <= 0n) return { awarded: false, duplicate: false, points: "0" };
      const account = await transaction.loyaltyAccount.upsert({ where: { userId: order.userId }, create: { userId: order.userId }, update: {} }); const earnedAt = new Date(); await transaction.loyaltyTransaction.create({ data: { accountId: account.id, points, entryType: "ORDER_EARNED", referenceType: "order", referenceId: orderId, idempotencyKey: `loyalty-earned:${orderId}`, expiresAt: loyaltyExpiresAt(earnedAt, currentPolicy), createdAt: earnedAt } }); await transaction.loyaltyAccount.update({ where: { id: account.id }, data: { pointsBalance: { increment: points }, version: { increment: 1 } } });
      await transaction.notification.upsert({ where: { idempotencyKey: `loyalty-earned-notification:${orderId}` }, update: {}, create: { userId: order.userId, type: "loyalty.earned", title: `${points.toString()} reward points added`, body: `Your delivered order earned Amiyo reward points.`, data: { href: "/loyalty", orderId }, idempotencyKey: `loyalty-earned-notification:${orderId}`, deliveries: { create: { channel: "in_app", status: "DELIVERED", deliveredAt: earnedAt } } } }); return { awarded: true, duplicate: false, points: points.toString() };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  };
}
