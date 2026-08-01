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

export type ReturnDto = z.infer<typeof returnSchema>;
