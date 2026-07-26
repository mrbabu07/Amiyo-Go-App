import { QueueEvents } from "bullmq";
import { Redis } from "ioredis";
import { parseWorkerEnv } from "@amiyo/config";
import { createLogger } from "@amiyo/observability";

const env = parseWorkerEnv(process.env);
const logger = createLogger("amiyo-worker", env.LOG_LEVEL);
const connection = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null });

const queues = [
  "order-events",
  "delivery-dispatch",
  "payment-webhooks",
  "notifications",
  "email",
  "sms",
  "media-processing",
  "catalog-import",
  "analytics-projection",
  "scheduled-campaigns",
  "data-retention"
];

const queueEvents = queues.map((queueName) => {
  const events = new QueueEvents(queueName, { connection });
  events.on("failed", ({ jobId, failedReason }) => {
    logger.error({ queueName, jobId, failedReason }, "Job failed");
  });
  return events;
});

logger.info({ queues, concurrency: env.WORKER_CONCURRENCY }, "Worker booted");

async function shutdown() {
  logger.info("Worker shutting down");
  await Promise.all(queueEvents.map((events) => events.close()));
  await connection.quit();
}

process.on("SIGTERM", () => void shutdown().then(() => process.exit(0)));
process.on("SIGINT", () => void shutdown().then(() => process.exit(0)));
