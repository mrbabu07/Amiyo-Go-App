import { z } from "zod";
import { moneySchema, timestampSchema, uuidSchema, versionSchema } from "./common.js";

export const paymentStatusSchema = z.enum([
  "INITIATED", "REQUIRES_ACTION", "AUTHORIZED", "CAPTURED", "PARTIALLY_REFUNDED", "REFUNDED", "FAILED", "CANCELLED", "EXPIRED"
]);

export const paymentSchema = z.object({
  id: uuidSchema,
  orderId: uuidSchema,
  provider: z.string().min(1),
  method: z.string().min(1),
  status: paymentStatusSchema,
  amount: moneySchema,
  refunded: moneySchema,
  version: versionSchema,
  createdAt: timestampSchema
});

export type PaymentDto = z.infer<typeof paymentSchema>;
