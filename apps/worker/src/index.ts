import { PrismaClient } from "@prisma/client";
import { Queue, Worker } from "bullmq";
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
import { ResendEmailProvider } from "./email/resend-email.provider.js";
import { createNewsletterProcessor } from "./email/newsletter.processor.js";
import { NewsletterOutboxRelay } from "./outbox/newsletter-outbox.relay.js";
import { createLoyaltyProcessor } from "./loyalty/loyalty.processor.js";
import { LoyaltyOutboxRelay } from "./outbox/loyalty-outbox.relay.js";
import { AbandonedCartScheduler } from "./growth/abandoned-cart.scheduler.js";
import { ProductAlertScheduler } from "./growth/product-alert.scheduler.js";
import { FlashAlertScheduler } from "./growth/flash-alert.scheduler.js";
import { bindWorkerObservability } from "./worker-observability.js";
import { withShutdownTimeout } from "./shutdown-timeout.js";
import { closeWorkerHealthServer, createWorkerHealthServer } from "./health-server.js";
import { SellerOperationsAlertScheduler } from "./vendor/seller-operations-alert.scheduler.js";
import { ReservationExpiryScheduler } from "./inventory/reservation-expiry.scheduler.js";
import { AccountDeletionScheduler } from "./identity/account-deletion.scheduler.js";
import { EphemeralRetentionScheduler } from "./retention/ephemeral-retention.scheduler.js";

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
const newsletterQueueName = "email";
const newsletterQueue = new Queue(newsletterQueueName, { connection });
const loyaltyQueueName = "loyalty";
const loyaltyQueue = new Queue(loyaltyQueueName, { connection });
const deliveryClient = new AmiyoDeliveryClient({ apiUrl: env.AMIYO_DELIVERY_API_URL || "", integrationToken: env.AMIYO_DELIVERY_INTEGRATION_TOKEN || "", signingSecret: env.AMIYO_DELIVERY_WEBHOOK_SECRET || env.AMIYO_DELIVERY_INTEGRATION_TOKEN || "", timeoutMs: env.AMIYO_DELIVERY_TIMEOUT_MS });
const worker = new Worker(queueName, createDeliveryProcessor(prisma, deliveryClient), { connection, concurrency: env.WORKER_CONCURRENCY });
const mediaWorker = new Worker(mediaQueueName, createMediaProcessor(prisma, new FirebaseWorkerMediaStorage()), { connection, concurrency: Math.max(1, Math.floor(env.WORKER_CONCURRENCY / 2)) });
const notificationWorker = new Worker(notificationQueueName, createNotificationProcessor(prisma, new ExpoPushProvider(), { provider: new ResendEmailProvider({ apiUrl: env.EMAIL_PROVIDER_API_URL || "https://api.resend.com/emails", token: env.EMAIL_PROVIDER_TOKEN, from: env.EMAIL_FROM }), appPublicUrl: env.APP_PUBLIC_URL }), { connection, concurrency: env.WORKER_CONCURRENCY });
const newsletterWorker = new Worker(newsletterQueueName, createNewsletterProcessor(prisma, new ResendEmailProvider({ apiUrl: env.EMAIL_PROVIDER_API_URL || "https://api.resend.com/emails", token: env.EMAIL_PROVIDER_TOKEN, from: env.EMAIL_FROM }), env.API_PUBLIC_URL), { connection, concurrency: env.WORKER_CONCURRENCY });
const loyaltyWorker = new Worker(loyaltyQueueName, createLoyaltyProcessor(prisma), { connection, concurrency: Math.max(1, Math.floor(env.WORKER_CONCURRENCY / 2)) });
const relay = new DeliveryOutboxRelay(prisma, queue, (error) => logger.error({ error }, "Delivery outbox relay failed"));
const mediaRelay = new MediaOutboxRelay(prisma, mediaQueue, (error) => logger.error({ error }, "Media outbox relay failed"));
const notificationRelay = new NotificationOutboxRelay(prisma, notificationQueue, (error) => logger.error({ error }, "Notification outbox relay failed"));
const newsletterRelay = new NewsletterOutboxRelay(prisma, newsletterQueue, (error) => logger.error({ error }, "Newsletter outbox relay failed"));
const loyaltyRelay = new LoyaltyOutboxRelay(prisma, loyaltyQueue, (error) => logger.error({ error }, "Loyalty outbox relay failed"));
const abandonedCartScheduler = new AbandonedCartScheduler(prisma, (error) => logger.error({ error }, "Abandoned cart scheduler failed"));
const productAlertScheduler = new ProductAlertScheduler(prisma, (error) => logger.error({ error }, "Product alert scheduler failed"));
const sellerOperationsAlertScheduler = new SellerOperationsAlertScheduler(prisma, (error) => logger.error({ error }, "Seller operations alert scheduler failed"));
const reservationExpiryScheduler = new ReservationExpiryScheduler(prisma, (error) => logger.error({ error }, "Inventory reservation expiry scheduler failed"));
const accountDeletionScheduler = new AccountDeletionScheduler(prisma, (error) => logger.error({ error }, "Account deletion scheduler failed"));
const ephemeralRetentionScheduler = new EphemeralRetentionScheduler(prisma, (error) => logger.error({ error }, "Ephemeral retention scheduler failed"));
let shuttingDown = false;
const queueWorkers = [worker, mediaWorker, notificationWorker, newsletterWorker, loyaltyWorker];
const healthServer = createWorkerHealthServer({
  logger,
  isShuttingDown: () => shuttingDown,
  readiness: async () => {
    if (queueWorkers.some((queueWorker) => !queueWorker.isRunning())) throw new Error("A queue worker is not running");
    const [redisStatus] = await Promise.all([connection.ping(), prisma.$queryRaw`SELECT 1`]);
    if (redisStatus !== "PONG") throw new Error("Redis did not acknowledge readiness");
  }
});

for (const [name, queueWorker] of [[queueName, worker], [mediaQueueName, mediaWorker], [notificationQueueName, notificationWorker], [newsletterQueueName, newsletterWorker], [loyaltyQueueName, loyaltyWorker]] as const) bindWorkerObservability(queueWorker, name, logger, { slowJobMs: env.WORKER_SLOW_JOB_MS });
relay.start();
mediaRelay.start();
notificationRelay.start();
newsletterRelay.start();
loyaltyRelay.start();
abandonedCartScheduler.start();
productAlertScheduler.start();
sellerOperationsAlertScheduler.start();
reservationExpiryScheduler.start();
accountDeletionScheduler.start();
ephemeralRetentionScheduler.start();
const flashAlertScheduler = new FlashAlertScheduler(prisma, (error) => logger.error({ error }, "Flash alert scheduler failed"));
flashAlertScheduler.start();
healthServer.listen(env.WORKER_HEALTH_PORT, "0.0.0.0", () => logger.info({ port: env.WORKER_HEALTH_PORT }, "Worker health server listening"));
logger.info({ queueName, concurrency: env.WORKER_CONCURRENCY }, "Worker booted");

async function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info({ signal }, "Worker shutting down");
  relay.stop(); mediaRelay.stop(); notificationRelay.stop(); newsletterRelay.stop(); loyaltyRelay.stop(); abandonedCartScheduler.stop(); reservationExpiryScheduler.stop(); accountDeletionScheduler.stop(); ephemeralRetentionScheduler.stop();
  await withShutdownTimeout((async () => {
    await closeWorkerHealthServer(healthServer);
    await Promise.all([productAlertScheduler.stop(), flashAlertScheduler.stop(), sellerOperationsAlertScheduler.stop()]);
    await Promise.all([worker.close(), mediaWorker.close(), notificationWorker.close(), newsletterWorker.close(), loyaltyWorker.close()]);
    await Promise.all([queue.close(), mediaQueue.close(), notificationQueue.close(), newsletterQueue.close(), loyaltyQueue.close()]);
    await Promise.all([prisma.$disconnect(), connection.quit()]);
  })(), env.SHUTDOWN_TIMEOUT_MS);
}

for (const signal of ["SIGTERM", "SIGINT"] as const) {
  process.on(signal, () => void shutdown(signal).then(() => process.exit(0), (error) => { logger.fatal({ error, signal }, "Worker shutdown failed"); process.exit(1); }));
}
