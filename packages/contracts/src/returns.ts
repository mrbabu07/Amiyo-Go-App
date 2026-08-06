import { z } from "zod";
import { moneySchema, timestampSchema, uuidSchema, versionSchema } from "./common.js";

export const returnStatusSchema = z.enum([
  "REQUESTED", "REVIEWING", "APPROVED", "REJECTED", "PICKUP_SCHEDULED", "RECEIVED", "INSPECTED", "REFUND_PENDING", "REFUNDED", "CLOSED"
]);

export const returnItemSchema = z.object({
  id: uuidSchema,
  orderItemId: uuidSchema,
  quantity: z.number().int().positive(),
  requestedAmount: moneySchema,
  inspection: z.record(z.unknown()).nullable()
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
  items: z.array(returnItemSchema)
});

export const createReturnSchema = z.object({
  vendorOrderId: uuidSchema,
  reasonCode: z.string().trim().min(2).max(80),
  reasonDetail: z.string().trim().max(1000).nullable().optional(),
  refundMethod: z.enum(["ORIGINAL_PAYMENT", "MANUAL"]).default("ORIGINAL_PAYMENT"),
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

export const cancelOrderSchema = z.object({ reason: z.string().trim().min(3).max(500), expectedVersion: versionSchema });

export type ReturnDto = z.infer<typeof returnSchema>;
export type CreateReturn = z.infer<typeof createReturnSchema>;
export type ReturnTransition = z.infer<typeof returnTransitionSchema>;
export type SellerReturnResponse = z.infer<typeof sellerReturnResponseSchema>;
export type SellerReturnReceipt = z.infer<typeof sellerReturnReceiptSchema>;
export type CancelOrder = z.infer<typeof cancelOrderSchema>;
