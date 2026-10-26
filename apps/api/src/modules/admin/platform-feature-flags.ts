import type { PrismaClient } from "@prisma/client";

export type PlatformFeature = "sellerRegistration" | "reviews" | "questions" | "flashSales" | "loyalty" | "voiceSearch" | "googleLogin";

export async function platformFeatureEnabled(database: PrismaClient, feature: PlatformFeature) {
  if (typeof database.platformConfiguration?.findUnique !== "function") return true;
  const row = await database.platformConfiguration.findUnique({ where: { key: "default" }, select: { featureFlags: true } });
  if (!row?.featureFlags || typeof row.featureFlags !== "object" || Array.isArray(row.featureFlags)) return true;
  return (row.featureFlags as Record<string, unknown>)[feature] !== false;
}
