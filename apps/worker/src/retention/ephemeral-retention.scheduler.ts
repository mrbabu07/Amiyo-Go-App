import type { PrismaClient } from "@prisma/client";

const pollIntervalMs = 6 * 60 * 60_000;
const days = (value: number) => value * 24 * 60 * 60_000;

export const ephemeralRetention = {
  processedOutboxDays: 30,
  expiredSessionDays: 30,
  notificationDeliveryDays: 90
} as const;

export class EphemeralRetentionScheduler {
  private timer: ReturnType<typeof setInterval> | null = null;
  private running = false;

  constructor(private readonly client: PrismaClient, private readonly onError: (error: unknown) => void) {}

  start() { this.timer = setInterval(() => void this.poll(), pollIntervalMs); void this.poll(); }
  stop() { if (this.timer) clearInterval(this.timer); this.timer = null; }

  async poll(now = new Date()) {
    if (this.running) return;
    this.running = true;
    try {
      const outboxBefore = new Date(now.getTime() - days(ephemeralRetention.processedOutboxDays));
      const sessionBefore = new Date(now.getTime() - days(ephemeralRetention.expiredSessionDays));
      const deliveryBefore = new Date(now.getTime() - days(ephemeralRetention.notificationDeliveryDays));
      await this.client.$transaction([
        this.client.idempotencyRecord.deleteMany({ where: { expiresAt: { not: null, lte: now } } }),
        this.client.outboxEvent.deleteMany({ where: { status: "processed", processedAt: { not: null, lte: outboxBefore } } }),
        this.client.refreshSession.deleteMany({ where: { expiresAt: { lte: sessionBefore } } }),
        this.client.notificationDelivery.deleteMany({ where: { status: { in: ["DELIVERED", "FAILED", "READ"] }, OR: [{ deliveredAt: { lte: deliveryBefore } }, { attemptedAt: { lte: deliveryBefore } }] } })
      ]);
    } catch (error) { this.onError(error); } finally { this.running = false; }
  }
}
