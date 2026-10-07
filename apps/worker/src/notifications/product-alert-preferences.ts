import type { Prisma } from "@prisma/client";

export function productAlertChannelEnabled(preferences: Prisma.JsonValue | undefined, channel: "email" | "push") {
  if (!preferences || typeof preferences !== "object" || Array.isArray(preferences)) return true;
  const notifications = preferences.notificationPreferences;
  if (!notifications || typeof notifications !== "object" || Array.isArray(notifications)) return true;
  const priceDrops = notifications.priceDrops;
  return !priceDrops || typeof priceDrops !== "object" || Array.isArray(priceDrops) || priceDrops[channel] !== false;
}

export function isProductAlert(type: string) {
  return type === "product.back_in_stock" || type === "product.target_price";
}
