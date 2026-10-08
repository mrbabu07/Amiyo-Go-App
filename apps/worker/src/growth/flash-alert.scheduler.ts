import { randomUUID } from "node:crypto";
import { Prisma, type PrismaClient } from "@prisma/client";
import { productAlertChannelEnabled } from "../notifications/product-alert-preferences.js";
import { matchingAlertVariant } from "./product-alert.scheduler.js";

type SaleEntry = { flashSaleId: string; priceMinor: bigint; quantityLimit: number | null; soldCount: number; flashSale: { status: string; startsAt: Date; endsAt: Date } };

export function eligibleFlashSale(sales: SaleEntry[], regularPrice: bigint, now: Date) {
  return sales.filter((sale) => sale.flashSale.status === "active" && sale.flashSale.startsAt <= now && sale.flashSale.endsAt > now &&
    sale.priceMinor >= 0n && sale.priceMinor < regularPrice && (sale.quantityLimit === null || sale.soldCount < sale.quantityLimit))
    .sort((left, right) => left.priceMinor < right.priceMinor ? -1 : left.priceMinor > right.priceMinor ? 1 : left.flashSaleId.localeCompare(right.flashSaleId))[0];
}

export class FlashAlertScheduler {
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

  async deliver(id: string, now = new Date()) {
    return this.client.$transaction(async (transaction) => {
      const configuration = await transaction.platformConfiguration.findUnique({ where: { key: "default" } });
      const flags = configuration?.featureFlags;
      if (flags && typeof flags === "object" && !Array.isArray(flags) && flags.flashSales === false) return false;
      const alert = await transaction.flashSaleAlert.findFirst({
        where: { id, active: true, user: { status: "ACTIVE", deletedAt: null }, product: { status: "APPROVED", shop: { status: "ACTIVE" }, vendor: { status: "APPROVED" } } },
        include: { user: { include: { profile: true } }, product: { include: { variants: { include: { inventory: true } }, flashSaleProducts: { where: { flashSale: { status: "active", startsAt: { lte: now }, endsAt: { gt: now } } }, include: { flashSale: true } } } } }
      });
      if (!alert) return false;
      const variant = matchingAlertVariant(alert.product.variants, null);
      if (!variant) return false;
      const sale = eligibleFlashSale(alert.product.flashSaleProducts, variant.priceMinor, now);
      if (!sale) return false;
      const claim = await transaction.flashSaleAlert.updateMany({ where: { id, active: true }, data: { active: false } });
      if (claim.count !== 1) return false;
      const preferences = alert.user.profile?.preferences;
      const notification = await transaction.notification.create({ data: {
        userId: alert.userId, type: "product.flash_sale", title: "Your saved product has a flash offer",
        body: `${alert.product.name} is included in a live flash sale. Check current price, options and availability before ordering.`,
        data: { href: `/product/${alert.product.slug || alert.productId}`, productId: alert.productId, flashSaleId: sale.flashSaleId, priceMinor: sale.priceMinor.toString(), currency: "BDT" },
        idempotencyKey: `flash-alert:${id}:${randomUUID()}`,
        deliveries: { create: [
          { channel: "in_app", status: "DELIVERED", deliveredAt: now },
          ...(productAlertChannelEnabled(preferences, "push") ? [{ channel: "push", status: "PENDING" as const }] : []),
          ...(alert.user.normalizedEmail && productAlertChannelEnabled(preferences, "email") ? [{ channel: "email", status: "PENDING" as const }] : [])
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
      const alerts = await this.client.flashSaleAlert.findMany({ where: { active: true, ...(this.afterId ? { id: { gt: this.afterId } } : {}) }, select: { id: true }, orderBy: { id: "asc" }, take: 250 });
      for (const alert of alerts) {
        try { await this.deliver(alert.id); } catch (error) { this.onError(error); }
      }
      this.afterId = alerts.length === 250 ? alerts.at(-1)?.id : undefined;
    } catch (error) { this.onError(error); } finally { this.running = false; }
  }
}
