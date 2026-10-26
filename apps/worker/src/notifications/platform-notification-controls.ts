import type { PrismaClient } from "@prisma/client";

export type NotificationControl = "orderUpdates" | "promotions" | "sellerAlerts" | "adminAlerts";

const prefixes: Array<[NotificationControl, string[]]> = [
  ["adminAlerts", ["admin."]],
  ["sellerAlerts", ["vendor."]],
  ["promotions", ["cart.abandoned", "product.back_in_stock", "product.target_price", "product.flash_sale", "loyalty.", "referral.", "campaign."]],
  ["orderUpdates", ["order.", "payment.", "refund.", "return.", "assisted_cart"]]
];

export function notificationControlForType(type: string): NotificationControl | null {
  if (type === "admin.broadcast") return "promotions";
  return prefixes.find(([, values]) => values.some((value) => type === value || type.startsWith(value)))?.[0] ?? null;
}

export async function notificationDeliveryEnabled(client: PrismaClient, type: string) {
  const control = notificationControlForType(type);
  if (!control || typeof client.platformConfiguration?.findUnique !== "function") return true;
  const row = await client.platformConfiguration.findUnique({ where: { key: "default" }, select: { notificationControls: true } });
  const controls = row?.notificationControls;
  if (!controls || typeof controls !== "object" || Array.isArray(controls)) return true;
  return (controls as Record<string, unknown>)[control] !== false;
}
