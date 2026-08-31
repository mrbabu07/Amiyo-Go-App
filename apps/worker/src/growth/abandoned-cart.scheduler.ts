import type { PrismaClient } from "@prisma/client";

const minute = 60_000;
const day = 24 * 60 * minute;

export function abandonedCartCutoffs(now = new Date(), abandonedMinutes = 60, lookbackDays = 7) {
  return { abandonedBefore: new Date(now.getTime() - abandonedMinutes * minute), createdAfter: new Date(now.getTime() - lookbackDays * day) };
}

export class AbandonedCartScheduler {
  private timer: ReturnType<typeof setInterval> | null = null;
  private running = false;
  private readonly abandonedMinutes = Math.max(15, Number(process.env.ABANDONED_CART_MINUTES || 60));
  private readonly lookbackDays = Math.max(1, Number(process.env.ABANDONED_CART_LOOKBACK_DAYS || 7));

  constructor(private readonly client: PrismaClient, private readonly onError: (error: unknown) => void) {}

  start() { this.timer = setInterval(() => void this.poll(), 15 * minute); void this.poll(); }
  stop() { if (this.timer) clearInterval(this.timer); this.timer = null; }

  async poll(now = new Date()) {
    if (this.running) return;
    this.running = true;
    try {
      const cutoffs = abandonedCartCutoffs(now, this.abandonedMinutes, this.lookbackDays);
      const carts = await this.client.cart.findMany({ where: { status: "ACTIVE", userId: { not: null }, updatedAt: { gte: cutoffs.createdAfter, lte: cutoffs.abandonedBefore }, items: { some: {} } }, select: { id: true, userId: true, updatedAt: true, _count: { select: { items: true } } }, orderBy: { updatedAt: "asc" }, take: 250 });
      for (const cart of carts) {
        if (!cart.userId) continue;
        await this.client.$transaction(async (transaction) => {
          const key = `abandoned-cart:${cart.id}:${cart.updatedAt.toISOString()}`;
          const notification = await transaction.notification.upsert({ where: { idempotencyKey: key }, update: {}, create: { userId: cart.userId!, type: "cart.abandoned", title: "Your cart is waiting", body: `${cart._count.items} item${cart._count.items === 1 ? "" : "s"} saved in your cart. Complete checkout before stock changes.`, data: { href: "/cart", cartId: cart.id }, idempotencyKey: key, deliveries: { create: [{ channel: "in_app", status: "DELIVERED", deliveredAt: now }, { channel: "push", status: "PENDING" }] } }, include: { deliveries: true } });
          for (const delivery of notification.deliveries.filter((item) => item.status === "PENDING")) await transaction.outboxEvent.upsert({ where: { idempotencyKey: `notification-delivery:${delivery.id}` }, update: {}, create: { aggregateType: "notification_delivery", aggregateId: delivery.id, eventType: "notification.delivery.requested", idempotencyKey: `notification-delivery:${delivery.id}`, payload: { notificationDeliveryId: delivery.id } } });
        });
      }
    } catch (error) { this.onError(error); } finally { this.running = false; }
  }
}
