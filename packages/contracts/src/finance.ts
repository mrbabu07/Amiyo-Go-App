import { z } from "zod";
import { moneySchema, timestampSchema, uuidSchema, versionSchema } from "./common.js";

export const payoutStatusSchema = z.enum(["REQUESTED", "REVIEWING", "APPROVED", "PROCESSING", "PAID", "REJECTED", "FAILED", "CANCELLED"]);
export const ledgerDirectionSchema = z.enum(["CREDIT", "DEBIT"]);

export const ledgerEntrySchema = z.object({
  id: uuidSchema,
  direction: ledgerDirectionSchema,
  amount: moneySchema,
  entryType: z.string(),
  referenceType: z.string(),
  referenceId: z.string(),
  createdAt: timestampSchema
});

export const vendorFinanceSchema = z.object({
  vendorId: uuidSchema,
  balance: moneySchema,
  entries: z.array(ledgerEntrySchema),
  payoutRequests: z.array(z.object({ id: uuidSchema, bankAccountId: uuidSchema, amount: moneySchema, status: payoutStatusSchema, requestedAt: timestampSchema }))
});

export const createPayoutRequestSchema = z.object({ bankAccountId: uuidSchema, amountMinor: z.string().regex(/^[1-9]\d*$/) });
export const reviewPayoutSchema = z.object({ expectedVersion: versionSchema, action: z.enum(["APPROVE", "REJECT"]), reason: z.string().trim().max(500).nullable().optional() });
export const completePayoutSchema = z.object({ provider: z.string().trim().min(2).max(80), providerRef: z.string().trim().min(2).max(200) });
export const completeRefundSchema = z.object({ providerRefundId: z.string().trim().min(2).max(200) });
export const codReconciliationInputSchema = z.object({ periodStart: z.string().datetime(), periodEnd: z.string().datetime() }).refine((value) => value.periodStart < value.periodEnd, "periodStart must precede periodEnd");

export type CreatePayoutRequest = z.infer<typeof createPayoutRequestSchema>;
export type ReviewPayout = z.infer<typeof reviewPayoutSchema>;
export type CompletePayout = z.infer<typeof completePayoutSchema>;
export type CompleteRefund = z.infer<typeof completeRefundSchema>;
export type CodReconciliationInput = z.infer<typeof codReconciliationInputSchema>;
