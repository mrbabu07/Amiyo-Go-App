export type LoyaltyPolicy = {
  enabled: boolean;
  earnAmountMinorPerPoint: bigint;
  redeemMinorPerPoint: bigint;
  minimumRedemptionPoints: bigint;
  maximumRedemptionBps: number;
  fraudHoldDays: number;
  expiryDays: number;
  referralRewardPoints: bigint;
};

export const defaultLoyaltyPolicy: LoyaltyPolicy = {
  enabled: true,
  earnAmountMinorPerPoint: 10_000n,
  redeemMinorPerPoint: 100n,
  minimumRedemptionPoints: 100n,
  maximumRedemptionBps: 2_000,
  fraudHoldDays: 7,
  expiryDays: 365,
  referralRewardPoints: 500n
};

export function loyaltyPointsEarned(eligibleAmountMinor: bigint, policy: LoyaltyPolicy = defaultLoyaltyPolicy) {
  if (!policy.enabled || eligibleAmountMinor <= 0n || policy.earnAmountMinorPerPoint <= 0n) return 0n;
  return eligibleAmountMinor / policy.earnAmountMinorPerPoint;
}

export function loyaltyRedemption(requestedPoints: bigint, availablePoints: bigint, payableMinor: bigint, policy: LoyaltyPolicy = defaultLoyaltyPolicy) {
  if (!policy.enabled || requestedPoints <= 0n) return { points: 0n, amountMinor: 0n };
  if (requestedPoints < policy.minimumRedemptionPoints) return { points: 0n, amountMinor: 0n };
  const positiveBalance = availablePoints > 0n ? availablePoints : 0n;
  const available = requestedPoints < positiveBalance ? requestedPoints : positiveBalance;
  const maximumAmount = (payableMinor * BigInt(policy.maximumRedemptionBps)) / 10_000n;
  const maximumPoints = policy.redeemMinorPerPoint > 0n ? maximumAmount / policy.redeemMinorPerPoint : 0n;
  const points = available < maximumPoints ? available : maximumPoints;
  return { points, amountMinor: points * policy.redeemMinorPerPoint };
}

export function loyaltyRefundReversal(totalPoints: bigint, refundMinor: bigint, originalPaidMinor: bigint) {
  if (totalPoints <= 0n || refundMinor <= 0n || originalPaidMinor <= 0n) return 0n;
  const boundedRefund = refundMinor > originalPaidMinor ? originalPaidMinor : refundMinor;
  return (totalPoints * boundedRefund + originalPaidMinor - 1n) / originalPaidMinor;
}

export function loyaltyReleaseAt(deliveredAt: Date, policy: LoyaltyPolicy = defaultLoyaltyPolicy) {
  return new Date(deliveredAt.getTime() + Math.max(0, policy.fraudHoldDays) * 86_400_000);
}

export function loyaltyExpiresAt(earnedAt: Date, policy: LoyaltyPolicy = defaultLoyaltyPolicy) {
  return new Date(earnedAt.getTime() + Math.max(1, policy.expiryDays) * 86_400_000);
}
