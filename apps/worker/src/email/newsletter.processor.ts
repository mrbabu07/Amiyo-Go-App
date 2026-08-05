import type { Job } from "bullmq";
import type { PrismaClient } from "@prisma/client";
import { newsletterDeliveryJobSchema } from "@amiyo/contracts";
import type { EmailProvider } from "./resend-email.provider.js";

async function refreshBroadcast(client: PrismaClient, broadcastId: string) {
  const [sentCount, failedCount, completedCount, broadcast] = await Promise.all([
    client.newsletterDelivery.count({ where: { broadcastId, status: "sent" } }),
    client.newsletterDelivery.count({ where: { broadcastId, status: "failed" } }),
    client.newsletterDelivery.count({ where: { broadcastId, status: { in: ["sent", "failed", "skipped"] } } }),
    client.newsletterBroadcast.findUniqueOrThrow({ where: { id: broadcastId }, select: { recipientCount: true } })
  ]);
  const status = completedCount < broadcast.recipientCount ? "sending" : failedCount ? "partial" : "sent";
  await client.newsletterBroadcast.update({ where: { id: broadcastId }, data: { sentCount, failedCount, status } });
}

export function createNewsletterProcessor(client: PrismaClient, email: EmailProvider, publicApiUrl: string) {
  return async (job: Job) => {
    const input = newsletterDeliveryJobSchema.parse(job.data);
    const delivery = await client.newsletterDelivery.findUnique({ where: { id: input.newsletterDeliveryId }, include: { broadcast: true, subscriber: true } });
    if (!delivery) throw new Error(`Newsletter delivery ${input.newsletterDeliveryId} was not found`);
    if (["sent", "skipped"].includes(delivery.status)) return { deduplicated: true };
    if (!delivery.subscriber.active) {
      await client.newsletterDelivery.update({ where: { id: delivery.id }, data: { status: "skipped", attemptedAt: new Date(), lastError: "SUBSCRIBER_UNSUBSCRIBED" } });
      await refreshBroadcast(client, delivery.broadcastId);
      return { skipped: true };
    }
    await client.newsletterBroadcast.update({ where: { id: delivery.broadcastId }, data: { status: "sending" } });
    const unsubscribeUrl = `${publicApiUrl.replace(/\/$/, "")}/api/v2/newsletter/unsubscribe/${delivery.subscriber.unsubscribeToken}`;
    try {
      const result = await email.send({ idempotencyKey: `newsletter-${delivery.id}`, to: delivery.email, subject: delivery.broadcast.subject, text: `${delivery.broadcast.previewText ? `${delivery.broadcast.previewText}\n\n` : ""}${delivery.broadcast.body}\n\nUnsubscribe: ${unsubscribeUrl}` });
      await client.newsletterDelivery.update({ where: { id: delivery.id }, data: { status: "sent", provider: email.name, providerRef: result.id, attempts: { increment: 1 }, lastError: null, attemptedAt: new Date(), sentAt: new Date() } });
      await refreshBroadcast(client, delivery.broadcastId);
      return { sent: true };
    } catch (error) {
      await client.newsletterDelivery.update({ where: { id: delivery.id }, data: { status: "failed", provider: email.name, attempts: { increment: 1 }, lastError: error instanceof Error ? error.message.slice(0, 500) : "EMAIL_DELIVERY_FAILED", attemptedAt: new Date() } });
      await refreshBroadcast(client, delivery.broadcastId);
      throw error;
    }
  };
}
