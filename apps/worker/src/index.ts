import { PrismaClient } from "@prisma/client";
import { Queue, QueueEvents, Worker } from "bullmq";
import { Redis } from "ioredis";
import { parseWorkerEnv } from "@amiyo/config";
import { createLogger } from "@amiyo/observability";
import { AmiyoDeliveryClient } from "./delivery/amiyo-delivery.client.js";
import { createDeliveryProcessor } from "./delivery/delivery.processor.js";
import { DeliveryOutboxRelay } from "./outbox/delivery-outbox.relay.js";
import { MediaOutboxRelay } from "./outbox/media-outbox.relay.js";
import { FirebaseWorkerMediaStorage } from "./media/firebase-media.storage.js";
import { createMediaProcessor } from "./media/media.processor.js";
import { ExpoPushProvider } from "./notifications/expo-push.provider.js";
import { createNotificationProcessor } from "./notifications/notification.processor.js";
import { NotificationOutboxRelay } from "./outbox/notification-outbox.relay.js";

const env = parseWorkerEnv(process.env);
const logger = createLogger("amiyo-worker", env.LOG_LEVEL);
const connection = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null });
const prisma = new PrismaClient();
const queueName = "delivery-dispatch";
const queue = new Queue(queueName, { connection });
const mediaQueueName = "media-processing";
const mediaQueue = new Queue(mediaQueueName, { connection });
const notificationQueueName = "notifications";
const notificationQueue = new Queue(notificationQueueName, { connection });
const queueEvents = new QueueEvents(queueName, { connection });
const deliveryClient = new AmiyoDeliveryClient({ apiUrl: env.AMIYO_DELIVERY_API_URL || "", integrationToken: env.AMIYO_DELIVERY_INTEGRATION_TOKEN || "", signingSecret: env.AMIYO_DELIVERY_WEBHOOK_SECRET || env.AMIYO_DELIVERY_INTEGRATION_TOKEN || "", timeoutMs: env.AMIYO_DELIVERY_TIMEOUT_MS });
const worker = new Worker(queueName, createDeliveryProcessor(prisma, deliveryClient), { connection, concurrency: env.WORKER_CONCURRENCY });
const mediaWorker = new Worker(mediaQueueName, createMediaProcessor(prisma, new FirebaseWorkerMediaStorage()), { connection, concurrency: Math.max(1, Math.floor(env.WORKER_CONCURRENCY / 2)) });
const notificationWorker = new Worker(notificationQueueName, createNotificationProcessor(prisma, new ExpoPushProvider()), { connection, concurrency: env.WORKER_CONCURRENCY });
const relay = new DeliveryOutboxRelay(prisma, queue, (error) => logger.error({ error }, "Delivery outbox relay failed"));
const mediaRelay = new MediaOutboxRelay(prisma, mediaQueue, (error) => logger.error({ error }, "Media outbox relay failed"));
const notificationRelay = new NotificationOutboxRelay(prisma, notificationQueue, (error) => logger.error({ error }, "Notification outbox relay failed"));

queueEvents.on("failed", ({ jobId, failedReason }) => logger.error({ queueName, jobId, failedReason }, "Delivery job failed"));
worker.on("completed", (job) => logger.info({ jobId: job.id }, "Delivery job completed"));
relay.start();
mediaRelay.start();
notificationRelay.start();
logger.info({ queueName, concurrency: env.WORKER_CONCURRENCY }, "Worker booted");

async function shutdown() {
  logger.info("Worker shutting down"); relay.stop(); mediaRelay.stop(); notificationRelay.stop(); await worker.close(); await mediaWorker.close(); await notificationWorker.close(); await queueEvents.close(); await queue.close(); await mediaQueue.close(); await notificationQueue.close(); await prisma.$disconnect(); await connection.quit();
}

process.on("SIGTERM", () => void shutdown().then(() => process.exit(0)));
process.on("SIGINT", () => void shutdown().then(() => process.exit(0)));
