import type { Notification, NotificationDelivery, PrismaClient } from "@prisma/client";
import type { EmailProvider } from "../email/resend-email.provider.js";
import { isProductAlert, productAlertChannelEnabled } from "./product-alert-preferences.js";

export type NotificationEmailConfig = { provider: EmailProvider; appPublicUrl?: string | undefined };

export function alertEmailProductUrl(appPublicUrl: string | undefined, data: Notification["data"]) {
  if (!appPublicUrl) return null;
  try {
    const base = new URL(appPublicUrl);
    if (!["https:", "http:"].includes(base.protocol) || base.username || base.password) return null;
    const href = data && typeof data === "object" && !Array.isArray(data) ? data.href : null;
    if (typeof href !== "string" || !/^\/product\/[a-zA-Z0-9_-]+$/.test(href)) return null;
    return new URL(href, base.origin).href;
  } catch { return null; }
}

export async function deliverProductAlertEmail(client: PrismaClient, delivery: NotificationDelivery & { notification: Notification }, config?: NotificationEmailConfig, now = new Date()) {
  const fail = async (errorCode: string) => {
    await client.notificationDelivery.update({ where: { id: delivery.id }, data: { status: "FAILED", errorCode, attemptedAt: now } });
    return { skipped: true };
  };
  if (!isProductAlert(delivery.notification.type)) return fail("EMAIL_TYPE_NOT_CONFIGURED");
  const age = now.getTime() - delivery.notification.createdAt.getTime();
  if (!Number.isFinite(age) || age < 0 || age >= 23 * 60 * 60_000) return fail("EMAIL_RETRY_WINDOW_EXPIRED");
  const user = await client.user.findUnique({ where: { id: delivery.notification.userId }, include: { profile: true } });
  if (!user || user.status !== "ACTIVE" || user.deletedAt) return fail("RECIPIENT_INACTIVE");
  if (!productAlertChannelEnabled(user.profile?.preferences, "email")) return fail("EMAIL_OPTED_OUT");
  if (!user.normalizedEmail) return fail("NO_EMAIL_ADDRESS");
  if (!config) throw new Error("EMAIL_PROVIDER_NOT_CONFIGURED");
  const url = alertEmailProductUrl(config.appPublicUrl, delivery.notification.data);
  if (!url) return fail("EMAIL_APP_URL_INVALID");
  try {
    const response = await config.provider.send({
      idempotencyKey: `product-alert-email-${delivery.id}`,
      to: user.normalizedEmail,
      subject: delivery.notification.title,
      text: `${delivery.notification.body}\n\nView product: ${url}\n\nYou requested this product alert. Manage future alerts in Amiyo's Product alerts page, or disable price-drop email in Account notification preferences.`
    });
    await client.notificationDelivery.update({ where: { id: delivery.id }, data: { status: "DELIVERED", provider: config.provider.name, providerRef: response.id, errorCode: null, attemptedAt: now, deliveredAt: now } });
    return { accepted: true };
  } catch (error) {
    await client.notificationDelivery.update({ where: { id: delivery.id }, data: { status: "FAILED", provider: config.provider.name, errorCode: "EMAIL_DELIVERY_UNCONFIRMED", attemptedAt: now } });
    throw error;
  }
}
