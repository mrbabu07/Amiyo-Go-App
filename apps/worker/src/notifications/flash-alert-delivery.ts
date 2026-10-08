import type { Notification, PrismaClient } from "@prisma/client";
import { eligibleFlashSale } from "../growth/flash-alert.scheduler.js";
import { matchingAlertVariant } from "../growth/product-alert.scheduler.js";
import { productAlertChannelEnabled } from "./product-alert-preferences.js";

export async function canDeliverFlashAlert(client: PrismaClient, notification: Notification, channel: string, now = new Date()) {
  if (notification.type !== "product.flash_sale") return true;
  if (channel !== "push" && channel !== "email") return false;
  const data = notification.data;
  if (!data || typeof data !== "object" || Array.isArray(data)) return false;
  const { flashSaleId, productId } = data;
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (typeof flashSaleId !== "string" || typeof productId !== "string" || !uuid.test(flashSaleId) || !uuid.test(productId)) return false;
  const [entry, configuration, user] = await Promise.all([
    client.flashSaleProduct.findUnique({ where: { flashSaleId_productId: { flashSaleId, productId } }, include: { flashSale: true, product: { include: { shop: true, vendor: true, variants: { include: { inventory: true } } } } } }),
    client.platformConfiguration.findUnique({ where: { key: "default" } }),
    client.user.findUnique({ where: { id: notification.userId }, include: { profile: true } })
  ]);
  const flags = configuration?.featureFlags;
  if (flags && typeof flags === "object" && !Array.isArray(flags) && flags.flashSales === false) return false;
  if (!entry || !user || user.status !== "ACTIVE" || user.deletedAt || !productAlertChannelEnabled(user.profile?.preferences, channel)) return false;
  if (entry.product.status !== "APPROVED" || entry.product.shop.status !== "ACTIVE" || entry.product.vendor.status !== "APPROVED") return false;
  const variant = matchingAlertVariant(entry.product.variants, null);
  return Boolean(variant && eligibleFlashSale([entry], variant.priceMinor, now));
}
