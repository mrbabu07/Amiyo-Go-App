import type { Job } from "bullmq";
import { Prisma, type PrismaClient } from "@prisma/client";
import { deliveryDispatchJobSchema } from "@amiyo/contracts";
import type { AmiyoDeliveryClient } from "./amiyo-delivery.client.js";

const json = (value: unknown) => JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;

export function createDeliveryProcessor(client: PrismaClient, provider: AmiyoDeliveryClient) {
  return async (job: Job) => {
    const input = deliveryDispatchJobSchema.parse(job.data);
    const dispatch = await client.deliveryDispatch.findUnique({ where: { id: input.dispatchId } });
    if (!dispatch) throw new Error(`Delivery dispatch ${input.dispatchId} was not found`);
    if (["DISPATCHED", "ACCEPTED"].includes(dispatch.status) && dispatch.externalOrderId) return { deduplicated: true, externalOrderId: dispatch.externalOrderId };
    const latest = await client.deliveryAttempt.aggregate({ where: { dispatchId: dispatch.id }, _max: { attemptNumber: true } });
    const attemptNumber = (latest._max.attemptNumber ?? 0) + 1;
    const attempt = await client.deliveryAttempt.create({ data: { dispatchId: dispatch.id, attemptNumber, status: "processing" } });
    try {
      const result = await provider.createDelivery(dispatch.requestSnapshot, dispatch.dispatchKey);
      await client.$transaction(async (transaction) => {
        await transaction.deliveryDispatch.update({ where: { id: dispatch.id }, data: { status: "DISPATCHED", externalOrderId: result.externalOrderId, responseSnapshot: json(result.response) } });
        await transaction.deliveryAttempt.update({ where: { id: attempt.id }, data: { status: "succeeded", finishedAt: new Date() } });
        await transaction.shipment.update({ where: { vendorOrderId: dispatch.vendorOrderId }, data: { provider: "amiyo_delivery", ...(result.trackingNumber ? { trackingNumber: result.trackingNumber } : {}) } });
        await transaction.outboxEvent.upsert({ where: { idempotencyKey: `delivery-dispatched:${dispatch.id}` }, create: { aggregateType: "delivery_dispatch", aggregateId: dispatch.id, eventType: "delivery.dispatched", idempotencyKey: `delivery-dispatched:${dispatch.id}`, payload: { dispatchId: dispatch.id, externalOrderId: result.externalOrderId } }, update: {} });
      });
      return { deduplicated: false, externalOrderId: result.externalOrderId };
    } catch (error) {
      await client.$transaction([client.deliveryAttempt.update({ where: { id: attempt.id }, data: { status: "failed", errorMessage: error instanceof Error ? error.message.slice(0, 500) : "Unknown delivery error", finishedAt: new Date() } }), client.deliveryDispatch.update({ where: { id: dispatch.id }, data: { status: "FAILED" } })]);
      throw error;
    }
  };
}
