import { createHmac, timingSafeEqual } from "node:crypto";
import { Prisma, type PrismaClient, type ShipmentStatus, type VendorOrderStatus } from "@prisma/client";
import { amiyoDeliveryCallbackSchema } from "@amiyo/contracts";
import { withSerializableTransaction } from "../../infrastructure/database/transaction.js";
import { ApiProblem } from "../../middleware/api-problem.js";
import { OutboxRepository } from "../outbox/outbox.repository.js";
import { synchronizeParentOrderStatus } from "./parent-status.service.js";

const rank: Record<ShipmentStatus, number> = { PENDING: 0, READY_TO_SHIP: 1, PICKED_UP: 2, IN_TRANSIT: 3, DELIVERED: 4, FAILED: 5, CANCELLED: 5 };
const vendorStatus: Partial<Record<ShipmentStatus, VendorOrderStatus>> = { PICKED_UP: "PICKED_UP", IN_TRANSIT: "IN_TRANSIT", DELIVERED: "DELIVERED" };
const json = (value: unknown) => JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;

function safeEqual(left: string | undefined, right: string) {
  if (!left) return false;
  const leftBuffer = Buffer.from(left); const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

export class DeliveryCallbackService {
  private readonly outbox = new OutboxRepository();
  constructor(private readonly client: PrismaClient) {}

  verify(rawBody: Buffer, headers: { apiKey: string | undefined; timestamp: string | undefined; signature: string | undefined }) {
    const apiKey = process.env.AMIYO_DELIVERY_CALLBACK_API_SECRET;
    const secret = process.env.AMIYO_DELIVERY_CALLBACK_SECRET;
    if (!apiKey || !secret) throw new ApiProblem(503, "DELIVERY_CALLBACK_NOT_CONFIGURED", "Delivery callback secrets are not configured");
    if (!safeEqual(headers.apiKey, apiKey)) throw new ApiProblem(401, "INVALID_DELIVERY_API_KEY", "Delivery callback API key is invalid");
    const timestamp = Number(headers.timestamp); const tolerance = Number(process.env.AMIYO_DELIVERY_CALLBACK_TOLERANCE_SECONDS || 300);
    if (!headers.timestamp || !Number.isFinite(timestamp) || Math.abs(Math.floor(Date.now() / 1000) - timestamp) > tolerance) throw new ApiProblem(401, "DELIVERY_CALLBACK_EXPIRED", "Delivery callback timestamp is invalid or expired");
    const expected = `sha256=${createHmac("sha256", secret).update(`${headers.timestamp}.${rawBody.toString("utf8")}`).digest("hex")}`;
    if (!safeEqual(headers.signature, expected)) throw new ApiProblem(401, "INVALID_DELIVERY_SIGNATURE", "Delivery callback signature is invalid");
  }

  async process(payload: unknown) {
    const event = amiyoDeliveryCallbackSchema.parse(payload);
    return withSerializableTransaction(this.client, async (transaction) => {
      const dispatch = await transaction.deliveryDispatch.findUnique({ where: { externalOrderId: event.externalOrderId }, include: { vendorOrder: true } });
      if (!dispatch) throw new ApiProblem(404, "DELIVERY_DISPATCH_NOT_FOUND", "Delivery dispatch not found");
      const duplicate = await transaction.deliveryCallback.findUnique({ where: { provider_providerEventId: { provider: "amiyo_delivery", providerEventId: event.eventId } } });
      if (duplicate) return { received: true, duplicate: true };
      const callback = await transaction.deliveryCallback.create({ data: { dispatchId: dispatch.id, provider: "amiyo_delivery", providerEventId: event.eventId, signatureValid: true, payload: json(event) } });
      const existingShipment = await transaction.shipment.findUnique({ where: { vendorOrderId: dispatch.vendorOrderId } });
      const eventData = { status: event.status, ...(event.description ? { description: event.description } : {}), ...(event.location ? { location: event.location } : {}), occurredAt: event.occurredAt ? new Date(event.occurredAt) : new Date(), providerPayload: json(event) };
      const shipment = await transaction.shipment.upsert({ where: { vendorOrderId: dispatch.vendorOrderId }, create: { vendorOrderId: dispatch.vendorOrderId, provider: "amiyo_delivery", status: "PENDING" }, update: {} });
      if (!existingShipment || rank[event.status] > rank[shipment.status] || ["FAILED", "CANCELLED"].includes(event.status)) {
        await transaction.shipment.update({ where: { id: shipment.id }, data: { status: event.status, ...(event.trackingNumber ? { trackingNumber: event.trackingNumber } : {}), ...(event.status === "DELIVERED" ? { deliveredAt: new Date(event.occurredAt || Date.now()) } : {}), ...(event.status === "PICKED_UP" ? { shippedAt: new Date(event.occurredAt || Date.now()) } : {}), events: { create: eventData } } });
        const nextVendorStatus = vendorStatus[event.status];
        if (nextVendorStatus) await transaction.vendorOrder.update({ where: { id: dispatch.vendorOrderId }, data: { status: nextVendorStatus, version: { increment: 1 } } });
        await transaction.deliveryDispatch.update({ where: { id: dispatch.id }, data: { status: event.status === "CANCELLED" ? "CANCELLED" : "ACCEPTED" } });
        await synchronizeParentOrderStatus(transaction, dispatch.vendorOrder.orderId, "amiyo_delivery");
        await this.outbox.enqueue(transaction, { aggregateType: "shipment", aggregateId: shipment.id, eventType: `shipment.${event.status.toLowerCase()}`, idempotencyKey: `delivery-callback:${event.eventId}`, payload: { orderId: dispatch.vendorOrder.orderId, vendorOrderId: dispatch.vendorOrderId, status: event.status } });
      }
      await transaction.deliveryCallback.update({ where: { id: callback.id }, data: { processedAt: new Date() } });
      await transaction.auditLog.create({ data: { actorType: "integration", action: "delivery.callback.processed", resourceType: "delivery_dispatch", resourceId: dispatch.id, after: json(event) } });
      return { received: true, duplicate: false };
    });
  }
}
