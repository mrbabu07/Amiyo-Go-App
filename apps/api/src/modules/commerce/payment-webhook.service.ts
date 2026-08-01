import { createHmac, timingSafeEqual } from "node:crypto";
import { Prisma, type PrismaClient, type PaymentStatus } from "@prisma/client";
import { z } from "zod";
import { withSerializableTransaction } from "../../infrastructure/database/transaction.js";
import { ApiProblem } from "../../middleware/api-problem.js";
import { OutboxRepository } from "../outbox/outbox.repository.js";

const eventSchema = z.object({ eventId: z.string().min(1).max(200), paymentId: z.string().uuid(), status: z.enum(["CAPTURED", "FAILED", "CANCELLED"]), transactionId: z.string().min(1).max(200).optional(), amountMinor: z.string().regex(/^\d+$/) });

export class PaymentWebhookService {
  private readonly outbox = new OutboxRepository();
  constructor(private readonly client: PrismaClient) {}

  verify(rawBody: Buffer, signature: string | undefined) {
    const secret = process.env.PAYMENT_WEBHOOK_SECRET; if (!secret) throw new ApiProblem(503, "PAYMENT_WEBHOOK_NOT_CONFIGURED", "Payment webhook secret is not configured");
    const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
    if (!signature || signature.length !== expected.length || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) throw new ApiProblem(401, "INVALID_WEBHOOK_SIGNATURE", "Webhook signature is invalid");
  }

  async process(provider: string, payload: unknown) {
    const event = eventSchema.parse(payload);
    return withSerializableTransaction(this.client, async (transaction) => {
      const duplicate = await transaction.paymentWebhook.findUnique({ where: { provider_providerEventId: { provider, providerEventId: event.eventId } } }); if (duplicate) return { received: true, duplicate: true };
      const payment = await transaction.payment.findUnique({ where: { id: event.paymentId }, include: { order: true } }); if (!payment) throw new ApiProblem(404, "PAYMENT_NOT_FOUND", "Payment not found");
      if (BigInt(event.amountMinor) !== payment.amountMinor) throw new ApiProblem(409, "PAYMENT_AMOUNT_MISMATCH", "Payment amount does not match the order");
      const webhook = await transaction.paymentWebhook.create({ data: { provider, providerEventId: event.eventId, signatureValid: true, payload: payload as Prisma.InputJsonValue } });
      if (payment.status !== "CAPTURED") {
        await transaction.payment.update({ where: { id: payment.id }, data: { status: event.status as PaymentStatus, ...(event.transactionId ? { providerTransactionId: event.transactionId } : {}), version: { increment: 1 } } });
        if (event.status === "CAPTURED" && payment.order.status === "PENDING_PAYMENT") {
          await transaction.order.update({ where: { id: payment.orderId }, data: { status: "CONFIRMED", version: { increment: 1 } } });
          await transaction.orderStatusEvent.create({ data: { orderId: payment.orderId, fromStatus: "PENDING_PAYMENT", toStatus: "CONFIRMED", actorType: "payment_provider" } });
        }
        await this.outbox.enqueue(transaction, { aggregateType: "payment", aggregateId: payment.id, eventType: `payment.${event.status.toLowerCase()}`, idempotencyKey: `payment-webhook:${provider}:${event.eventId}`, payload: { paymentId: payment.id, orderId: payment.orderId, status: event.status } });
      }
      await transaction.paymentWebhook.update({ where: { id: webhook.id }, data: { processedAt: new Date() } }); return { received: true, duplicate: false };
    });
  }
}
