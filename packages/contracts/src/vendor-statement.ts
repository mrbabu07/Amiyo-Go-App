import { z } from "./zod.js";
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

export const vendorChargeReportSchema = z.object({
  vendorId: uuidSchema, vendorName: z.string(), month: z.string(),
  generatedAt: timestampSchema, periodStart: timestampSchema, periodEnd: timestampSchema,
  basis: z.literal("ORDER_CREATED_AT"), currency: z.literal("BDT"),
  commissionMinor: z.string().regex(/^\d+$/),
  orders: z.array(z.object({
    id: uuidSchema, orderNumber: z.string(), status: z.string(), createdAt: timestampSchema,
    subtotalMinor: z.string().regex(/^\d+$/), discountMinor: z.string().regex(/^\d+$/),
    commissionMinor: z.string().regex(/^\d+$/), included: z.boolean()
  })).max(5000)
});
export type VendorChargeReport = z.infer<typeof vendorChargeReportSchema>;

export const approveOrderSettlementSchema = z.object({ expectedVersion: z.number().int().positive(), expectedAmountMinor: z.string().regex(/^[1-9]\d*$/), shippingRecipient: z.enum(["VENDOR", "PLATFORM"]), reason: z.string().trim().min(10).max(1000) });
export const orderSettlementResultSchema = z.object({ id: uuidSchema, amountMinor: z.string().regex(/^\d+$/), currency: z.literal("BDT"), alreadySettled: z.boolean() });

export const vendorCommissionInvoiceSchema = z.object({
  vendorId: uuidSchema, vendorName: z.string(), month: z.string(), reference: z.string(), generatedAt: timestampSchema,
  earned: signedMoney, reversed: signedMoney, net: signedMoney,
  entries: z.array(z.object({ id: uuidSchema, createdAt: timestampSchema, referenceId: z.string(), kind: z.enum(["COMMISSION", "COMMISSION_REVERSAL"]), amount: signedMoney })).max(5000)
});
export type VendorCommissionInvoice = z.infer<typeof vendorCommissionInvoiceSchema>;
