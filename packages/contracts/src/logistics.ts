import { z } from "zod";
import { timestampSchema, uuidSchema } from "./common.js";
import { shipmentStatusSchema } from "./delivery.js";

const minorSchema = z.string().regex(/^\d+$/);
const statusSchema = z.enum(["active", "inactive"]);
const stringList = z.array(z.string().trim().min(1).max(120)).max(100);

export const logisticsZoneInputSchema = z.object({
  name: z.string().trim().min(2).max(120), code: z.string().trim().min(2).max(40).transform((value) => value.toUpperCase()), districts: stringList,
  courierPartnerIds: z.array(uuidSchema).max(30), defaultCourierName: z.string().trim().max(120).nullable().default(null), codAvailable: z.boolean(),
  status: statusSchema, slaHours: z.number().int().min(1).max(720), sortOrder: z.number().int().min(0).max(10_000), notes: z.string().trim().max(1000).nullable().default(null)
});

export const courierPartnerInputSchema = z.object({
  name: z.string().trim().min(2).max(120), code: z.string().trim().min(2).max(40).transform((value) => value.toUpperCase()), status: statusSchema,
  provider: z.string().trim().min(2).max(80), bookingMode: z.enum(["manual", "api"]), coverageType: z.string().trim().min(2).max(80),
  outsideDistrict: z.boolean(), localArea: z.boolean(), instantDelivery: z.boolean(), trackingUrlPattern: z.string().trim().max(500).nullable().default(null),
  contactName: z.string().trim().max(120).nullable().default(null), phone: z.string().trim().max(30).nullable().default(null), email: z.string().email().nullable().default(null),
  serviceZones: stringList, codSupported: z.boolean(), baseDeliveryCostMinor: minorSchema, codCollectionFeeMinor: minorSchema,
  defaultSlaHours: z.number().int().min(1).max(720), slaZoneCode: z.string().trim().max(40).nullable().default(null), slaProcessingHours: z.number().int().min(0).max(720),
  slaDeliveryDaysMin: z.number().int().min(0).max(60), slaDeliveryDaysMax: z.number().int().min(0).max(90), notes: z.string().trim().max(1000).nullable().default(null)
}).refine((value) => value.slaDeliveryDaysMin <= value.slaDeliveryDaysMax, "Minimum SLA days cannot exceed maximum SLA days");

export const pickupStaffInputSchema = z.object({
  name: z.string().trim().min(2).max(120), phone: z.string().trim().max(30).nullable().default(null), email: z.string().email().nullable().default(null),
  userId: uuidSchema.nullable().default(null), status: statusSchema, routeName: z.string().trim().max(120).nullable().default(null), assignedZones: stringList,
  assignedLocations: z.array(z.record(z.string())).max(100), assignedVendorIds: z.array(uuidSchema).max(100), vehicleType: z.string().trim().min(2).max(40),
  capacityOrders: z.number().int().min(1).max(1000), shiftStart: z.string().regex(/^\d{2}:\d{2}$/), shiftEnd: z.string().regex(/^\d{2}:\d{2}$/), notes: z.string().trim().max(1000).nullable().default(null)
});

export const deliveryFeeRuleInputSchema = z.object({
  name: z.string().trim().min(2).max(120), ruleType: z.string().trim().min(2).max(60), status: statusSchema, priority: z.number().int().min(0).max(10_000),
  zoneCode: z.string().trim().max(40).nullable().default(null), minOrderAmountMinor: minorSchema, maxOrderAmountMinor: minorSchema,
  minWeightGrams: z.number().int().min(0), maxWeightGrams: z.number().int().min(0), baseFeeMinor: minorSchema, perItemFeeMinor: minorSchema,
  feePerKgMinor: minorSchema, codFeeMinor: minorSchema, redeliveryFeeMinor: minorSchema, freeShippingThresholdMinor: minorSchema,
  paymentMethods: stringList, notes: z.string().trim().max(1000).nullable().default(null)
});

export const logisticsAssignmentInputSchema = z.object({
  courierPartnerId: uuidSchema.nullable().default(null), pickupStaffId: uuidSchema.nullable().default(null), bookingMode: z.enum(["manual", "api"]),
  trackingNumber: z.string().trim().max(160).nullable().default(null), pickupDate: timestampSchema.nullable().default(null), pickupWindow: z.string().trim().max(80).nullable().default(null),
  estimatedDeliveryDate: timestampSchema.nullable().default(null), note: z.string().trim().max(500).nullable().default(null), expectedVersion: z.number().int().positive().nullable().default(null)
});

export const logisticsShipmentTransitionSchema = z.object({ status: shipmentStatusSchema, note: z.string().trim().min(2).max(500) });
export const logisticsDeliveryAttemptSchema = z.object({ outcome: z.enum(["delivered", "failed"]), receiverName: z.string().trim().max(120).nullable().default(null), reason: z.string().trim().max(500).nullable().default(null), notes: z.string().trim().max(1000).nullable().default(null), codCollected: z.boolean().default(false) });
export const codRemittanceInputSchema = z.object({ courierPartnerId: uuidSchema.nullable().default(null), courierName: z.string().trim().min(2).max(120), collectedAmountMinor: minorSchema, remittedAmountMinor: minorSchema, forwardedToVendorMinor: minorSchema, reference: z.string().trim().max(160).nullable().default(null), notes: z.string().trim().max(1000).nullable().default(null), orderIds: z.array(uuidSchema).max(500) });
export const failedDeliveryReattemptSchema = z.object({ nextAttemptAt: timestampSchema, redeliveryFeeMinor: minorSchema, reason: z.string().trim().min(2).max(500), note: z.string().trim().max(1000).nullable().default(null) });
export const failedDeliveryReturnSchema = z.object({ returnFeeMinor: minorSchema, reason: z.string().trim().min(2).max(500), note: z.string().trim().max(1000).nullable().default(null) });
export const logisticsNoteSchema = z.object({ note: z.string().trim().min(2).max(1000) });
export const logisticsTrackingEventSchema = z.object({
  shipmentId: uuidSchema, status: shipmentStatusSchema, description: z.string().trim().min(2).max(500),
  location: z.string().trim().max(200).nullable().default(null), occurredAt: timestampSchema,
  providerEventId: z.string().trim().max(160).nullable().default(null)
});
export const logisticsManifestPickupSchema = z.object({ shipmentIds: z.array(uuidSchema).min(1).max(250), note: z.string().trim().min(2).max(1000) });
export const logisticsReturnActionSchema = z.object({
  note: z.string().trim().min(2).max(1000), trackingNumber: z.string().trim().max(160).nullable().default(null),
  pickupAt: timestampSchema.nullable().default(null), inspection: z.record(z.unknown()).nullable().default(null)
});
export const logisticsCodStateInputSchema = z.object({
  reference: z.string().trim().min(2).max(160).nullable().default(null),
  reason: z.string().trim().min(2).max(500).nullable().default(null),
  note: z.string().trim().min(2).max(1000)
});

export type LogisticsZoneInput = z.infer<typeof logisticsZoneInputSchema>;
export type CourierPartnerInput = z.infer<typeof courierPartnerInputSchema>;
export type PickupStaffInput = z.infer<typeof pickupStaffInputSchema>;
export type DeliveryFeeRuleInput = z.infer<typeof deliveryFeeRuleInputSchema>;
export type LogisticsAssignmentInput = z.infer<typeof logisticsAssignmentInputSchema>;
export type LogisticsShipmentTransition = z.infer<typeof logisticsShipmentTransitionSchema>;
export type LogisticsDeliveryAttempt = z.infer<typeof logisticsDeliveryAttemptSchema>;
export type LogisticsNote = z.infer<typeof logisticsNoteSchema>;
export type LogisticsTrackingEvent = z.infer<typeof logisticsTrackingEventSchema>;
export type LogisticsManifestPickup = z.infer<typeof logisticsManifestPickupSchema>;
export type LogisticsReturnAction = z.infer<typeof logisticsReturnActionSchema>;
export type LogisticsCodStateInput = z.infer<typeof logisticsCodStateInputSchema>;
export type CodRemittanceInput = z.infer<typeof codRemittanceInputSchema>;
export type FailedDeliveryReattempt = z.infer<typeof failedDeliveryReattemptSchema>;
export type FailedDeliveryReturn = z.infer<typeof failedDeliveryReturnSchema>;
