import { randomUUID } from "node:crypto";
import { Prisma, type PrismaClient } from "@prisma/client";

type AlertVariant = { id: string; active: boolean; currency: string; priceMinor: bigint; inventory: { onHand: number; reserved: number } | null };

export function matchingAlertVariant(variants: AlertVariant[], targetMinor: bigint | null) {
  return variants.filter((variant) => variant.active && variant.currency === "BDT" && variant.priceMinor >= 0n &&
    variant.inventory && variant.inventory.onHand > variant.inventory.reserved &&
    (targetMinor === null || (targetMinor > 0n && variant.priceMinor <= targetMinor)))
    .sort((left, right) => left.priceMinor < right.priceMinor ? -1 : left.priceMinor > right.priceMinor ? 1 : left.id.localeCompare(right.id))[0];
}

export function productAlertPushEnabled(preferences: Prisma.JsonValue | undefined) {
  if (!preferences || typeof preferences !== "object" || Array.isArray(preferences)) return true;
  const notifications = preferences.notificationPreferences;
  if (!notifications || typeof notifications !== "object" || Array.isArray(notifications)) return true;
  const priceDrops = notifications.priceDrops;
  return !priceDrops || typeof priceDrops !== "object" || Array.isArray(priceDrops) || priceDrops.push !== false;
}

export class ProductAlertScheduler {
  private timer: ReturnType<typeof setInterval> | null = null;
  private running = false;
  private afterId: string | undefined;

  constructor(private readonly client: PrismaClient, private readonly onError: (error: unknown) => void) {}

  start() {
    if (this.timer) return;
    this.timer = setInterval(() => void this.poll(), 60_000);
    void this.poll();
  }

  async stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    while (this.running) await new Promise((resolve) => setTimeout(resolve, 25));
  }

  async deliver(alertId: string, now = new Date()) {
    return this.client.$transaction(async (transaction) => {
      const alert = await transaction.stockAlert.findFirst({
        where: { id: alertId, active: true, user: { status: "ACTIVE", deletedAt: null }, product: { status: "APPROVED", shop: { status: "ACTIVE" }, vendor: { status: "APPROVED" } } },
        include: { user: { include: { profile: true } }, product: { include: { variants: { include: { inventory: true } } } } }
      });
      if (!alert) return false;
      const variant = matchingAlertVariant(alert.product.variants, alert.targetMinor);
      if (!variant) return false;
      const claimed = await transaction.stockAlert.updateMany({ where: { id: alert.id, active: true }, data: { active: false } });
      if (claimed.count !== 1) return false;
      const notification = await transaction.notification.create({ data: {
        userId: alert.userId,
        type: alert.targetMinor === null ? "product.back_in_stock" : "product.target_price",
        title: alert.targetMinor === null ? "Your saved product is available" : "Your target price is available",
        body: `${alert.product.name} has an available option matching your alert. Check current price and stock before ordering.`,
        data: { href: `/product/${alert.product.slug || alert.productId}`, productId: alert.productId, variantId: variant.id, priceMinor: variant.priceMinor.toString(), currency: variant.currency },
        idempotencyKey: `product-alert:${alert.id}:${randomUUID()}`,
        deliveries: { create: [
          { channel: "in_app", status: "DELIVERED", deliveredAt: now },
          ...(productAlertPushEnabled(alert.user.profile?.preferences) ? [{ channel: "push", status: "PENDING" as const }] : [])
        ] }
      }, include: { deliveries: true } });
      for (const delivery of notification.deliveries.filter((item) => item.status === "PENDING")) {
        await transaction.outboxEvent.create({ data: { aggregateType: "notification_delivery", aggregateId: delivery.id, eventType: "notification.delivery.requested", idempotencyKey: `notification-delivery:${delivery.id}`, payload: { notificationDeliveryId: delivery.id } } });
      }
      return true;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  async poll() {
    if (this.running) return;
    this.running = true;
    try {
      const alerts = await this.client.stockAlert.findMany({ where: { active: true, ...(this.afterId ? { id: { gt: this.afterId } } : {}) }, select: { id: true }, orderBy: { id: "asc" }, take: 250 });
      for (const alert of alerts) {
        try { await this.deliver(alert.id); } catch (error) { this.onError(error); }
      }
      this.afterId = alerts.length === 250 ? alerts.at(-1)?.id : undefined;
    } catch (error) { this.onError(error); } finally { this.running = false; }
  }
}
