import type { PrismaClient } from "@prisma/client";
import type { WorkerMediaStorage } from "../media/firebase-media.storage.js";

const pollIntervalMs = 6 * 60 * 60_000;
const hours = (value: number) => value * 60 * 60_000;
const days = (value: number) => value * 24 * 60 * 60_000;

export const mediaUploadRetention = {
  expiredPendingGraceHours: 24,
  rejectedDays: 7,
  batchSize: 100
} as const;

export class MediaUploadRetentionScheduler {
  private timer: ReturnType<typeof setInterval> | null = null;
  private running = false;

  constructor(
    private readonly client: PrismaClient,
    private readonly storage: WorkerMediaStorage,
    private readonly onError: (error: unknown) => void
  ) {}

  start() { this.timer = setInterval(() => void this.poll(), pollIntervalMs); void this.poll(); }
  stop() { if (this.timer) clearInterval(this.timer); this.timer = null; }

  async poll(now = new Date()) {
    if (this.running) return;
    this.running = true;
    try {
      const pendingBefore = new Date(now.getTime() - hours(mediaUploadRetention.expiredPendingGraceHours));
      const rejectedBefore = new Date(now.getTime() - days(mediaUploadRetention.rejectedDays));
      const uploads = await this.client.mediaUpload.findMany({
        where: {
          OR: [
            { status: "pending", expiresAt: { lte: pendingBefore } },
            { status: "rejected", createdAt: { lte: rejectedBefore } }
          ]
        },
        select: { id: true, status: true, storageKey: true },
        orderBy: { createdAt: "asc" },
        take: mediaUploadRetention.batchSize
      });
      for (const upload of uploads) {
        try {
          await this.storage.remove(upload.storageKey);
          await this.client.mediaUpload.deleteMany({ where: { id: upload.id, status: upload.status, storageKey: upload.storageKey } });
        } catch (error) {
          this.onError(error);
        }
      }
    } catch (error) {
      this.onError(error);
    } finally {
      this.running = false;
    }
  }
}
