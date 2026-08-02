import { z } from "zod";
import { moneySchema, timestampSchema, uuidSchema, versionSchema } from "./common.js";
import { orderItemSchema, parentOrderStatusSchema, vendorOrderStatusSchema } from "./orders.js";

export const shipmentStatusSchema = z.enum(["PENDING", "READY_TO_SHIP", "PICKED_UP", "IN_TRANSIT", "DELIVERED", "FAILED", "CANCELLED"]);
export const dispatchStatusSchema = z.enum(["PENDING", "DISPATCHED", "ACCEPTED", "FAILED", "CANCELLED"]);

export const vendorOrderTransitionSchema = z.object({
  status: vendorOrderStatusSchema,
  expectedVersion: versionSchema,
  reason: z.string().trim().min(2).max(300).optional()
});

export const shipmentEventSchema = z.object({
  id: uuidSchema,
  status: shipmentStatusSchema,
  description: z.string().nullable(),
  location: z.string().nullable(),
  occurredAt: timestampSchema
});

export const shipmentSchema = z.object({
  id: uuidSchema,
  status: shipmentStatusSchema,
  provider: z.string().nullable(),
  trackingNumber: z.string().nullable(),
  events: z.array(shipmentEventSchema)
});

export const vendorOrderDetailSchema = z.object({
  id: uuidSchema,
  orderId: uuidSchema,
  orderNumber: z.string(),
  vendorId: uuidSchema,
  shopId: uuidSchema,
  shopName: z.string(),
  status: vendorOrderStatusSchema,
  subtotal: moneySchema,
  discount: moneySchema,
  delivery: moneySchema,
  total: moneySchema,
  version: versionSchema,
  createdAt: timestampSchema,
  items: z.array(orderItemSchema),
  shipment: shipmentSchema.nullable(),
  dispatchStatus: dispatchStatusSchema.nullable()
});

export const customerOrderSummarySchema = z.object({
  id: uuidSchema,
  orderNumber: z.string(),
  status: parentOrderStatusSchema,
  total: moneySchema,
  createdAt: timestampSchema,
  vendorOrderCount: z.number().int().positive()
});

export const orderTrackingSchema = z.object({
  orderId: uuidSchema,
  orderNumber: z.string(),
  status: parentOrderStatusSchema,
  shipments: z.array(z.object({ vendorOrderId: uuidSchema, shopName: z.string(), shipment: shipmentSchema.nullable() }))
});

export const deliveryDispatchJobSchema = z.object({ dispatchId: uuidSchema, idempotencyKey: z.string().startsWith("delivery-create:") });

export const deliveryRetryInputSchema = z.object({ reason: z.string().trim().min(3).max(300) });

export const deliveryQueueItemSchema = z.object({
  id: uuidSchema,
  vendorOrderId: uuidSchema,
  orderNumber: z.string(),
  dispatchKey: z.string(),
  status: dispatchStatusSchema,
  externalOrderId: z.string().nullable(),
  attempts: z.number().int().nonnegative(),
  lastError: z.string().nullable(),
  updatedAt: timestampSchema
});

export const deliveryRetryResultSchema = z.object({ id: uuidSchema, status: z.literal("PENDING"), queued: z.literal(true) });

export const amiyoDeliveryCallbackSchema = z.object({
  eventId: z.string().trim().min(1).max(200),
  externalOrderId: z.string().trim().min(1).max(200),
  status: z.enum(["PICKED_UP", "IN_TRANSIT", "DELIVERED", "FAILED", "CANCELLED"]),
  trackingNumber: z.string().trim().max(200).optional(),
  description: z.string().trim().max(500).optional(),
  location: z.string().trim().max(200).optional(),
  occurredAt: timestampSchema.optional(),
  rider: z.object({ name: z.string().trim().max(120).optional(), phone: z.string().trim().max(30).optional() }).optional()
});

export type VendorOrderDetail = z.infer<typeof vendorOrderDetailSchema>;
export type VendorOrderTransition = z.infer<typeof vendorOrderTransitionSchema>;
export type CustomerOrderSummary = z.infer<typeof customerOrderSummarySchema>;
export type OrderTracking = z.infer<typeof orderTrackingSchema>;
export type DeliveryDispatchJob = z.infer<typeof deliveryDispatchJobSchema>;
export type DeliveryRetryInput = z.infer<typeof deliveryRetryInputSchema>;
export type DeliveryQueueItem = z.infer<typeof deliveryQueueItemSchema>;
export type DeliveryRetryResult = z.infer<typeof deliveryRetryResultSchema>;
export type AmiyoDeliveryCallback = z.infer<typeof amiyoDeliveryCallbackSchema>;
