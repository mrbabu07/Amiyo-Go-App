import type { PrismaClient } from "@prisma/client";
import type { Queue } from "bullmq";
import { mediaProcessingJobSchema } from "@amiyo/contracts";

export class MediaOutboxRelay {
  private timer: ReturnType<typeof setInterval> | null = null; private running = false;
  constructor(private readonly client: PrismaClient, private readonly queue: Queue, private readonly onError: (error: unknown) => void) {}
  start() { this.timer = setInterval(() => void this.poll(), 1_000); void this.poll(); }
  async poll() { if (this.running) return; this.running = true; try { await this.client.outboxEvent.updateMany({ where: { eventType: "media.uploaded", status: "processing", availableAt: { lte: new Date() } }, data: { status: "pending" } }); const events = await this.client.outboxEvent.findMany({ where: { eventType: "media.uploaded", status: "pending", availableAt: { lte: new Date() } }, orderBy: { createdAt: "asc" }, take: 25 }); for (const event of events) { const claimed = await this.client.outboxEvent.updateMany({ where: { id: event.id, status: "pending" }, data: { status: "processing", attempts: { increment: 1 }, availableAt: new Date(Date.now() + 5 * 60_000) } }); if (!claimed.count) continue; try { const data = mediaProcessingJobSchema.parse(event.payload); await this.queue.add("MEDIA_VALIDATE", data, { jobId: `media-${data.mediaUploadId}`, attempts: 5, backoff: { type: "exponential", delay: 2_000 }, removeOnComplete: { age: 7 * 24 * 60 * 60, count: 10_000 }, removeOnFail: false }); await this.client.outboxEvent.update({ where: { id: event.id }, data: { status: "processed", processedAt: new Date() } }); } catch (error) { await this.client.outboxEvent.update({ where: { id: event.id }, data: { status: "pending", availableAt: new Date(Date.now() + 5_000) } }); this.onError(error); } } } catch (error) { this.onError(error); } finally { this.running = false; } }
  stop() { if (this.timer) clearInterval(this.timer); this.timer = null; }
}
