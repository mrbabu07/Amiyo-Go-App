import type { PrismaClient } from "@prisma/client";

const pollIntervalMs = 60_000;

export class AccountDeletionScheduler {
  private timer: ReturnType<typeof setInterval> | null = null;
  private running = false;

  constructor(private readonly client: PrismaClient, private readonly onError: (error: unknown) => void) {}

  start() { this.timer = setInterval(() => void this.poll(), pollIntervalMs); void this.poll(); }
  stop() { if (this.timer) clearInterval(this.timer); this.timer = null; }

  async poll(now = new Date()) {
    if (this.running) return;
    this.running = true;
    try {
      const requests = await this.client.accountDeletionRequest.findMany({
        where: { status: { in: ["requested", "scheduled"] }, executeAfter: { lte: now } },
        select: { id: true },
        orderBy: { executeAfter: "asc" },
        take: 100
      });
      for (const request of requests) await this.execute(request.id, now);
    } catch (error) { this.onError(error); } finally { this.running = false; }
  }

  private async execute(requestId: string, now: Date) {
    await this.client.$transaction(async (transaction) => {
      await transaction.$queryRaw`SELECT id FROM account_deletion_requests WHERE id = ${requestId}::uuid FOR UPDATE`;
      const request = await transaction.accountDeletionRequest.findUnique({ where: { id: requestId }, include: { user: { select: { id: true, status: true, normalizedEmail: true, normalizedPhone: true } } } });
      if (!request || !["requested", "scheduled"].includes(request.status) || request.executeAfter > now) return;
      if (request.user.status === "ANONYMIZED") {
        await transaction.accountDeletionRequest.update({ where: { id: request.id }, data: { status: "completed", completedAt: request.completedAt ?? now } });
        return;
      }
      await transaction.pushToken.updateMany({ where: { userId: request.userId, revokedAt: null }, data: { revokedAt: now } });
      await transaction.device.updateMany({ where: { userId: request.userId, revokedAt: null }, data: { revokedAt: now } });
      await transaction.refreshSession.updateMany({ where: { userId: request.userId, revokedAt: null }, data: { revokedAt: now } });
      await transaction.stockAlert.updateMany({ where: { userId: request.userId, active: true }, data: { active: false } });
      await transaction.flashSaleAlert.updateMany({ where: { userId: request.userId, active: true }, data: { active: false } });
      await transaction.address.deleteMany({ where: { userId: request.userId } });
      await transaction.userProfile.updateMany({ where: { userId: request.userId }, data: { firstName: null, lastName: null, displayName: null, avatarStorageKey: null, preferences: {} } });
      await transaction.user.update({ where: { id: request.userId }, data: { status: "ANONYMIZED", normalizedEmail: null, normalizedPhone: null, lastLoginAt: null, deletedAt: now } });
      await transaction.accountDeletionRequest.update({ where: { id: request.id }, data: { status: "completed", completedAt: now } });
      await transaction.auditLog.create({ data: { actorType: "system", action: "identity.account.anonymized", resourceType: "user", resourceId: request.userId, before: { status: request.user.status, hadEmail: Boolean(request.user.normalizedEmail), hadPhone: Boolean(request.user.normalizedPhone) }, after: { status: "ANONYMIZED", completedAt: now.toISOString(), retainedProviderTombstone: true } } });
    });
  }
}
