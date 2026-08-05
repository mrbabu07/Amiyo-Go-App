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
export const fulfillmentDocumentSchema = z.object({ parcelId: z.string(), orderId: uuidSchema, orderNumber: z.string(), vendorOrderId: uuidSchema, shopName: z.string(), status: vendorOrderStatusSchema, createdAt: timestampSchema, customer: z.object({ name: z.string(), phone: z.string(), address: z.string() }), pickup: z.object({ name: z.string(), phone: z.string(), address: z.string() }), payment: z.object({ method: z.string(), collectAmount: moneySchema }), subtotal: moneySchema, delivery: moneySchema, discount: moneySchema, total: moneySchema, trackingNumber: z.string().nullable(), items: z.array(z.object({ id: uuidSchema, name: z.string(), sku: z.string(), quantity: z.number().int().positive(), unitPrice: moneySchema, lineTotal: moneySchema })) });

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

const deliveryMinorSchema = z.string().regex(/^\d+$/);
export const deliverySettingsSchema = z.object({ key: z.literal("default"), standardChargeMinor: deliveryMinorSchema, freeDeliveryEnabled: z.boolean(), freeDeliveryThresholdMinor: deliveryMinorSchema, baseLocation: z.object({ division: z.string(), district: z.string(), upazila: z.string(), union: z.string() }), zoneFees: z.object({ sameUnionMinor: deliveryMinorSchema, sameUpazilaMinor: deliveryMinorSchema, sameDistrictMinor: deliveryMinorSchema, outsideDistrictMinor: deliveryMinorSchema }), estimatedDays: z.object({ min: z.number().int().positive(), max: z.number().int().positive() }), version: z.number().int().positive() });
export const deliverySettingsInputSchema = z.object({ standardChargeMinor: deliveryMinorSchema, freeDeliveryEnabled: z.boolean(), freeDeliveryThresholdMinor: deliveryMinorSchema, baseLocation: z.object({ division: z.string().trim().min(2).max(100), district: z.string().trim().min(2).max(100), upazila: z.string().trim().min(2).max(100), union: z.string().trim().min(2).max(100) }), zoneFees: z.object({ sameUnionMinor: deliveryMinorSchema, sameUpazilaMinor: deliveryMinorSchema, sameDistrictMinor: deliveryMinorSchema, outsideDistrictMinor: deliveryMinorSchema }), estimatedDays: z.object({ min: z.number().int().min(1).max(30), max: z.number().int().min(1).max(60) }), expectedVersion: z.number().int().positive() }).refine((value) => value.estimatedDays.min <= value.estimatedDays.max, "Minimum delivery days cannot exceed maximum days");
export const serviceabilityInputSchema = z.object({ division: z.string().trim().min(2).max(100), district: z.string().trim().min(2).max(100), upazila: z.string().trim().min(2).max(100), union: z.string().trim().min(2).max(100), subtotalMinor: deliveryMinorSchema.default("0") });
export const serviceabilitySchema = z.object({ serviceable: z.boolean(), zone: z.enum(["same_union", "same_upazila", "same_district", "outside_district"]), charge: moneySchema, freeDelivery: z.boolean(), amountNeededForFreeDelivery: moneySchema, estimatedDays: z.object({ min: z.number().int(), max: z.number().int() }) });

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
export type FulfillmentDocument = z.infer<typeof fulfillmentDocumentSchema>;
export type DeliveryDispatchJob = z.infer<typeof deliveryDispatchJobSchema>;
export type DeliveryRetryInput = z.infer<typeof deliveryRetryInputSchema>;
export type DeliveryQueueItem = z.infer<typeof deliveryQueueItemSchema>;
export type DeliveryRetryResult = z.infer<typeof deliveryRetryResultSchema>;
export type DeliverySettingsInput = z.infer<typeof deliverySettingsInputSchema>;
export type ServiceabilityInput = z.infer<typeof serviceabilityInputSchema>;
export type AmiyoDeliveryCallback = z.infer<typeof amiyoDeliveryCallbackSchema>;
