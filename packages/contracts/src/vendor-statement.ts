import { z } from "zod";
import { timestampSchema, uuidSchema } from "./common.js";
import { ledgerEntrySchema } from "./finance.js";

export const vendorStatementQuerySchema = z.object({ month: z.string().regex(/^20\d{2}-(0[1-9]|1[0-2])$/), vendorId: uuidSchema.optional() });
const signedMoney = z.object({ amountMinor: z.string().regex(/^-?\d+$/), currency: z.string().length(3) });
export const vendorStatementSchema = z.object({
  vendorId: uuidSchema, vendorName: z.string(), month: z.string(), timezone: z.literal("Asia/Dhaka"),
  periodStart: timestampSchema, periodEnd: timestampSchema, generatedAt: timestampSchema,
  opening: signedMoney, credits: signedMoney, debits: signedMoney, closing: signedMoney,
  entries: z.array(ledgerEntrySchema).max(5000)
});
export type VendorStatement = z.infer<typeof vendorStatementSchema>;
