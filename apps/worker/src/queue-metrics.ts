import type { Queue } from "bullmq";

const states = ["waiting", "active", "delayed", "failed", "completed", "paused"] as const;
type QueueCounts = Record<(typeof states)[number], number>;
type QueueEntry = { name: string; queue: Pick<Queue, "getJobCounts"> };

function label(value: string) { return value.replaceAll("\\", "\\\\").replaceAll('"', '\\"').replaceAll("\n", "\\n"); }

export async function collectWorkerQueueCounts(queues: QueueEntry[]) {
  const samples: Array<{ queueName: string; counts: QueueCounts }> = [];
  for (const entry of queues) {
    const result = await entry.queue.getJobCounts(...states);
    samples.push({ queueName: entry.name, counts: Object.fromEntries(states.map((state) => [state, result[state] ?? 0])) as QueueCounts });
  }
  return samples;
}

export async function workerQueueMetrics(queues: QueueEntry[]) {
  const lines = [
    "# HELP amiyo_worker_queue_jobs BullMQ jobs by queue and state.",
    "# TYPE amiyo_worker_queue_jobs gauge"
  ];
  for (const sample of await collectWorkerQueueCounts(queues)) for (const state of states) lines.push(`amiyo_worker_queue_jobs{queue="${label(sample.queueName)}",state="${state}"} ${sample.counts[state]}`);
  lines.push("");
  return lines.join("\n");
}

export class QueueMetricsScheduler {
  private timer: ReturnType<typeof setInterval> | null = null;
  private running = false;

  constructor(private readonly queues: QueueEntry[], private readonly logger: { info(values: Record<string, unknown>, message: string): void; error(values: Record<string, unknown>, message: string): void }) {}

  start() { this.timer = setInterval(() => void this.poll(), 60_000); void this.poll(); }
  stop() { if (this.timer) clearInterval(this.timer); this.timer = null; }

  async poll() {
    if (this.running) return;
    this.running = true;
    try {
      for (const sample of await collectWorkerQueueCounts(this.queues)) this.logger.info(sample, "Worker queue metrics");
    } catch (error) { this.logger.error({ error }, "Worker queue metrics collection failed"); }
    finally { this.running = false; }
  }
}
