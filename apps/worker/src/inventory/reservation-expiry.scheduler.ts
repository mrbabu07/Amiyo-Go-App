import type { PrismaClient } from "@prisma/client";

const pollIntervalMs = 60_000;

export class ReservationExpiryScheduler {
  private timer: ReturnType<typeof setInterval> | null = null;
  private running = false;

  constructor(private readonly client: PrismaClient, private readonly onError: (error: unknown) => void) {}

  start() { this.timer = setInterval(() => void this.poll(), pollIntervalMs); void this.poll(); }
  stop() { if (this.timer) clearInterval(this.timer); this.timer = null; }

  async poll(now = new Date()) {
    if (this.running) return;
    this.running = true;
    try {
      const candidates = await this.client.order.findMany({
        where: { status: "PENDING_PAYMENT", reservations: { some: { status: "ACTIVE", expiresAt: { lte: now } } } },
        select: { id: true },
        orderBy: { createdAt: "asc" },
        take: 100
      });
      for (const candidate of candidates) await this.expire(candidate.id, now);
    } catch (error) { this.onError(error); } finally { this.running = false; }
  }

  private async expire(orderId: string, now: Date) {
    await this.client.$transaction(async (transaction) => {
      await transaction.$queryRaw`SELECT id FROM orders WHERE id = ${orderId}::uuid FOR UPDATE`;
      const order = await transaction.order.findUnique({ where: { id: orderId }, select: { id: true, status: true, version: true, payments: { orderBy: { createdAt: "desc" }, take: 1, select: { id: true, status: true } }, reservations: { where: { status: "ACTIVE" }, select: { id: true, variantId: true, quantity: true } } } });
      if (!order || order.status !== "PENDING_PAYMENT" || !order.reservations.length) return;
      for (const reservation of order.reservations) {
        const inventory = await transaction.inventoryItem.findUnique({ where: { variantId: reservation.variantId }, select: { id: true, reserved: true } });
        if (!inventory || inventory.reserved < reservation.quantity) throw new Error(`Inventory reservation ${reservation.id} is inconsistent`);
        await transaction.inventoryItem.update({ where: { id: inventory.id }, data: { reserved: { decrement: reservation.quantity }, version: { increment: 1 }, movements: { create: { type: "RELEASE", quantity: reservation.quantity, referenceType: "order", referenceId: order.id, metadata: { reason: "Payment window expired" }, idempotencyKey: `expiry-release:${reservation.id}` } } } });
      }
      await transaction.inventoryReservation.updateMany({ where: { orderId, status: "ACTIVE" }, data: { status: "EXPIRED" } });
      await transaction.vendorOrder.updateMany({ where: { orderId, status: { notIn: ["CANCELLED", "DELIVERED"] } }, data: { status: "CANCELLED", version: { increment: 1 } } });
      const payment = order.payments[0];
      if (payment && !["CAPTURED", "PARTIALLY_REFUNDED", "REFUNDED", "FAILED", "CANCELLED", "EXPIRED"].includes(payment.status)) await transaction.payment.update({ where: { id: payment.id }, data: { status: "EXPIRED", version: { increment: 1 } } });
      await transaction.order.update({ where: { id: order.id }, data: { status: "CANCELLED", version: { increment: 1 }, statusEvents: { create: { fromStatus: "PENDING_PAYMENT", toStatus: "CANCELLED", actorType: "system", reason: "Payment window expired" } } } });
      await transaction.outboxEvent.upsert({ where: { idempotencyKey: `order-payment-expired:${order.id}` }, update: {}, create: { aggregateType: "order", aggregateId: order.id, eventType: "order.payment_expired", idempotencyKey: `order-payment-expired:${order.id}`, payload: { orderId: order.id } } });
      await transaction.auditLog.create({ data: { actorType: "system", action: "order.payment_expired", resourceType: "order", resourceId: order.id, before: { status: "PENDING_PAYMENT", version: order.version }, after: { status: "CANCELLED", expiredAt: now.toISOString() } } });
    });
  }
}
