import type { Worker } from "bullmq";

type WorkerLogger = {
  info(values: Record<string, unknown>, message: string): void;
  warn(values: Record<string, unknown>, message: string): void;
  error(values: Record<string, unknown>, message: string): void;
};

function threshold(value: string | undefined) {
  const parsed = Number(value ?? 5_000);
  return Number.isInteger(parsed) && parsed >= 1 ? parsed : 5_000;
}

export function bindWorkerObservability(worker: Worker, queueName: string, logger: WorkerLogger, options: { slowJobMs?: number; now?: () => number } = {}) {
  const slowJobMs = options.slowJobMs ?? threshold(process.env.WORKER_SLOW_JOB_MS);
  const now = options.now ?? Date.now;
  worker.on("completed", (job) => {
    const durationMs = job.processedOn ? Math.max(0, (job.finishedOn ?? now()) - job.processedOn) : null;
    const values = { queueName, jobId: job.id ?? null, jobName: job.name, attemptsMade: job.attemptsMade, durationMs };
    if (durationMs !== null && durationMs >= slowJobMs) logger.warn(values, "Slow worker job completed");
    else logger.info(values, "Worker job completed");
  });
  worker.on("failed", (job, error) => {
    const durationMs = job?.processedOn ? Math.max(0, now() - job.processedOn) : null;
    logger.error({ queueName, jobId: job?.id ?? null, jobName: job?.name ?? null, attemptsMade: job?.attemptsMade ?? null, durationMs, error: error.message.slice(0, 500) }, "Worker job failed");
  });
  worker.on("stalled", (jobId) => logger.warn({ queueName, jobId }, "Worker job stalled"));
  worker.on("error", (error) => logger.error({ queueName, error }, "Worker runtime error"));
}
