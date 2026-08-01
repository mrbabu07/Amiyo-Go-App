import { PrismaClient } from "@prisma/client";
import { Queue, QueueEvents, Worker } from "bullmq";
import { Redis } from "ioredis";
import { parseWorkerEnv } from "@amiyo/config";
import { createLogger } from "@amiyo/observability";
import { AmiyoDeliveryClient } from "./delivery/amiyo-delivery.client.js";
import { createDeliveryProcessor } from "./delivery/delivery.processor.js";
import { DeliveryOutboxRelay } from "./outbox/delivery-outbox.relay.js";

const env = parseWorkerEnv(process.env);
const logger = createLogger("amiyo-worker", env.LOG_LEVEL);
const connection = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null });
const prisma = new PrismaClient();
const queueName = "delivery-dispatch";
const queue = new Queue(queueName, { connection });
const queueEvents = new QueueEvents(queueName, { connection });
const deliveryClient = new AmiyoDeliveryClient({ apiUrl: env.AMIYO_DELIVERY_API_URL || "", integrationToken: env.AMIYO_DELIVERY_INTEGRATION_TOKEN || "", signingSecret: env.AMIYO_DELIVERY_WEBHOOK_SECRET || env.AMIYO_DELIVERY_INTEGRATION_TOKEN || "", timeoutMs: env.AMIYO_DELIVERY_TIMEOUT_MS });
const worker = new Worker(queueName, createDeliveryProcessor(prisma, deliveryClient), { connection, concurrency: env.WORKER_CONCURRENCY });
const relay = new DeliveryOutboxRelay(prisma, queue, (error) => logger.error({ error }, "Delivery outbox relay failed"));

queueEvents.on("failed", ({ jobId, failedReason }) => logger.error({ queueName, jobId, failedReason }, "Delivery job failed"));
worker.on("completed", (job) => logger.info({ jobId: job.id }, "Delivery job completed"));
relay.start();
logger.info({ queueName, concurrency: env.WORKER_CONCURRENCY }, "Worker booted");

async function shutdown() {
  logger.info("Worker shutting down"); relay.stop(); await worker.close(); await queueEvents.close(); await queue.close(); await prisma.$disconnect(); await connection.quit();
}

process.on("SIGTERM", () => void shutdown().then(() => process.exit(0)));
process.on("SIGINT", () => void shutdown().then(() => process.exit(0)));
