import { z } from "./zod.js";
import { moneySchema, timestampSchema, uuidSchema, versionSchema } from "./common.js";

export const returnEvidenceFileSchema = z.object({ id: uuidSchema, name: z.string(), mimeType: z.string() });
export const returnEvidenceAccessSchema = z.object({ url: z.string().url().startsWith("https://"), expiresAt: timestampSchema });
export const returnReasonSchema = z.string().trim().toUpperCase().pipe(z.enum(["DAMAGED", "DEFECTIVE", "WRONG_ITEM", "OTHER"]));

export const returnStatusSchema = z.enum([
  "REQUESTED", "REVIEWING", "APPROVED", "REJECTED", "PICKUP_SCHEDULED", "RECEIVED", "INSPECTED", "REFUND_PENDING", "REFUNDED", "CLOSED"
]);

export const returnItemSchema = z.object({
  id: uuidSchema,
  orderItemId: uuidSchema,
  productName: z.string().optional(),
  sku: z.string().optional(),
  attributes: z.record(z.string(), z.unknown()).nullable().optional(),
  thumbnailUrl: z.string().url().nullable().optional(),
  quantity: z.number().int().positive(),
  requestedAmount: moneySchema,
  inspection: z.record(z.string(), z.unknown()).nullable()
});

export const returnSchema = z.object({
  id: uuidSchema,
  orderId: uuidSchema,
  vendorOrderId: uuidSchema,
  status: returnStatusSchema,
  reasonCode: z.string().min(1),
  reasonDetail: z.string().nullable(),
  requestedAmount: moneySchema,
  approvedAmount: moneySchema.nullable(),
  version: versionSchema,
  createdAt: timestampSchema,
  refundMethod: z.string().nullable().optional(),
  events: z.array(z.object({
    id: uuidSchema,
    fromStatus: returnStatusSchema.nullable(),
    toStatus: returnStatusSchema,
    createdAt: timestampSchema
  })).optional(),
  items: z.array(returnItemSchema)
});

export const createReturnSchema = z.object({
  vendorOrderId: uuidSchema,
  reasonCode: returnReasonSchema,
  reasonDetail: z.string().trim().max(1000).nullable().optional(),
  refundMethod: z.enum(["ORIGINAL_PAYMENT", "MANUAL"]).default("ORIGINAL_PAYMENT"),
  evidenceStorageKeys: z.array(z.string().trim().min(3).max(500)).max(5).refine((keys) => new Set(keys).size === keys.length, "Evidence files must be unique").optional(),
  items: z.array(z.object({ orderItemId: uuidSchema, quantity: z.number().int().positive() })).min(1)
}).refine((value) => new Set(value.items.map((item) => item.orderItemId)).size === value.items.length, "Return items must be unique");

export const returnTransitionSchema = z.object({
  expectedVersion: versionSchema,
  status: returnStatusSchema,
  note: z.string().trim().max(1000).nullable().optional(),
  approvedAmountMinor: z.string().regex(/^\d+$/).optional()
});

export const sellerReturnResponseSchema = z.object({
  expectedVersion: versionSchema,
  action: z.enum(["APPROVE", "DISPUTE", "REJECT"]),
  reason: z.string().trim().min(3).max(1000).nullable().optional(),
  notes: z.string().trim().max(1000).nullable().optional(),
  evidenceStorageKeys: z.array(z.string().trim().min(3).max(500)).max(5).default([])
}).superRefine((value, context) => { if (["DISPUTE", "REJECT"].includes(value.action) && !value.reason) context.addIssue({ code: "custom", message: "A reason is required for disputes and rejections", path: ["reason"] }); });

export const sellerReturnReceiptSchema = z.object({
  expectedVersion: versionSchema,
  condition: z.enum(["received", "damaged", "incomplete"]),
  receivedQuantity: z.number().int().positive(),
  notes: z.string().trim().max(1000).nullable().optional()
});

export const cancellationReasonCodeSchema = z.enum(["CHANGED_MIND", "ORDERED_BY_MISTAKE", "WRONG_ADDRESS", "PAYMENT_ISSUE", "DUPLICATE_ORDER", "OTHER", "ADMIN_OVERRIDE"]);
export const cancelOrderSchema = z.object({ reasonCode: cancellationReasonCodeSchema.default("OTHER"), reason: z.string().trim().min(3).max(500), expectedVersion: versionSchema });

export type ReturnDto = z.infer<typeof returnSchema>;
export type ReturnReason = z.infer<typeof returnReasonSchema>;
export type CreateReturn = z.infer<typeof createReturnSchema>;
export type ReturnTransition = z.infer<typeof returnTransitionSchema>;
export type SellerReturnResponse = z.infer<typeof sellerReturnResponseSchema>;
export type SellerReturnReceipt = z.infer<typeof sellerReturnReceiptSchema>;
export type CancelOrder = z.infer<typeof cancelOrderSchema>;
export type CancellationReasonCode = z.infer<typeof cancellationReasonCodeSchema>;
