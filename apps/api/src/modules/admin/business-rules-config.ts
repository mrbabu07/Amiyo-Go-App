import { Prisma, type PrismaClient } from "@prisma/client";
import type { LoyaltyPolicy } from "@amiyo/domain";

export type BusinessRules = {
  loyalty: LoyaltyPolicy;
  promotions: { maximumStackedDiscountBps: number; allowCodeWithAutomatic: boolean };
  settlement: { minimumPayoutMinor: bigint; holdDays: number; cadenceDays: number; automaticProposal: boolean };
  refunds: { requireProviderReference: boolean; allowPartial: boolean };
};

type StoredBusinessRules = {
  loyalty?: Partial<Record<keyof LoyaltyPolicy, boolean | number | string>>;
  promotions?: Partial<BusinessRules["promotions"]>;
  settlement?: Partial<{ minimumPayoutMinor: string; holdDays: number; cadenceDays: number; automaticProposal: boolean }>;
  refunds?: Partial<BusinessRules["refunds"]>;
};

export const defaultBusinessRules: BusinessRules = {
  loyalty: { enabled: true, earnAmountMinorPerPoint: 10_000n, redeemMinorPerPoint: 100n, minimumRedemptionPoints: 100n, maximumRedemptionBps: 2_000, fraudHoldDays: 7, expiryDays: 365, referralRewardPoints: 500n },
  promotions: { maximumStackedDiscountBps: 3_500, allowCodeWithAutomatic: true },
  settlement: { minimumPayoutMinor: 50_000n, holdDays: 7, cadenceDays: 7, automaticProposal: true },
  refunds: { requireProviderReference: true, allowPartial: true }
};

export function serializeBusinessRules(rules: BusinessRules) {
  return {
    loyalty: { ...rules.loyalty, earnAmountMinorPerPoint: rules.loyalty.earnAmountMinorPerPoint.toString(), redeemMinorPerPoint: rules.loyalty.redeemMinorPerPoint.toString(), minimumRedemptionPoints: rules.loyalty.minimumRedemptionPoints.toString(), referralRewardPoints: rules.loyalty.referralRewardPoints.toString() },
    promotions: rules.promotions,
    settlement: { ...rules.settlement, minimumPayoutMinor: rules.settlement.minimumPayoutMinor.toString() },
    refunds: rules.refunds
  };
}

export function parseBusinessRules(value: Prisma.JsonValue | null | undefined): BusinessRules {
  const stored = value && typeof value === "object" && !Array.isArray(value) ? value as StoredBusinessRules : {};
  const loyalty = stored.loyalty ?? {};
  return {
    loyalty: {
      enabled: typeof loyalty.enabled === "boolean" ? loyalty.enabled : defaultBusinessRules.loyalty.enabled,
      earnAmountMinorPerPoint: BigInt(loyalty.earnAmountMinorPerPoint ?? defaultBusinessRules.loyalty.earnAmountMinorPerPoint),
      redeemMinorPerPoint: BigInt(loyalty.redeemMinorPerPoint ?? defaultBusinessRules.loyalty.redeemMinorPerPoint),
      minimumRedemptionPoints: BigInt(loyalty.minimumRedemptionPoints ?? defaultBusinessRules.loyalty.minimumRedemptionPoints),
      maximumRedemptionBps: Number(loyalty.maximumRedemptionBps ?? defaultBusinessRules.loyalty.maximumRedemptionBps),
      fraudHoldDays: Number(loyalty.fraudHoldDays ?? defaultBusinessRules.loyalty.fraudHoldDays),
      expiryDays: Number(loyalty.expiryDays ?? defaultBusinessRules.loyalty.expiryDays),
      referralRewardPoints: BigInt(loyalty.referralRewardPoints ?? defaultBusinessRules.loyalty.referralRewardPoints)
    },
    promotions: { ...defaultBusinessRules.promotions, ...stored.promotions },
    settlement: { ...defaultBusinessRules.settlement, ...stored.settlement, minimumPayoutMinor: BigInt(stored.settlement?.minimumPayoutMinor ?? defaultBusinessRules.settlement.minimumPayoutMinor) },
    refunds: { ...defaultBusinessRules.refunds, ...stored.refunds }
  };
}

export async function loadBusinessRules(database: PrismaClient | Prisma.TransactionClient) {
  const row = await database.platformConfiguration.findUnique({ where: { key: "business-rules" } });
  return { rules: parseBusinessRules(row?.featureFlags), version: row?.version ?? 1 };
}

export function businessRulesCreateData(rules: BusinessRules, updatedBy?: string | null) {
  return {
    key: "business-rules",
    featureFlags: serializeBusinessRules(rules) as unknown as Prisma.InputJsonValue,
    paymentMethods: {} as Prisma.InputJsonValue,
    maintenanceMode: {} as Prisma.InputJsonValue,
    returnPolicy: {} as Prisma.InputJsonValue,
    tax: {} as Prisma.InputJsonValue,
    seo: {} as Prisma.InputJsonValue,
    notificationControls: {} as Prisma.InputJsonValue,
    villageOperations: {} as Prisma.InputJsonValue,
    ...(updatedBy ? { updatedBy } : {})
  };
}
