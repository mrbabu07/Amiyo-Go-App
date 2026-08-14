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
export const adminCodDeliveryInputSchema = z.object({ expectedVersion: versionSchema, courierName: z.string().trim().min(2).max(120), note: z.string().trim().max(500).nullable().default(null) });
export const adminCodConfirmationInputSchema = z.object({ expectedVersion: versionSchema, collectedAmountMinor: z.string().regex(/^\d+$/), reference: z.string().trim().min(2).max(200), courierName: z.string().trim().min(2).max(120), note: z.string().trim().max(500).nullable().default(null) });
export const adminCodOrderSchema = z.object({ orderId: uuidSchema, orderNumber: z.string(), version: versionSchema, customerName: z.string(), customerPhone: z.string().nullable(), vendorNames: z.array(z.string()), deliveryZone: z.string(), courierName: z.string().nullable(), shipmentStatus: z.string(), delivered: z.boolean(), waitingDelivery: z.boolean(), awaitingConfirmation: z.boolean(), paymentId: uuidSchema, paymentStatus: z.string(), paymentConfirmed: z.boolean(), totalMinor: z.string().regex(/^\d+$/), currency: z.string().length(3), reconciliationStatus: z.enum(["pending_dispatch", "dispatched", "delivered", "awaiting_confirmation", "collected", "discrepancy", "remitted"]), collectedMinor: z.string().regex(/^\d+$/).nullable(), discrepancyMinor: z.string().regex(/^-?\d+$/), hasDiscrepancy: z.boolean(), collectorRef: z.string().nullable(), collectedAt: timestampSchema.nullable(), createdAt: timestampSchema });
export const adminCodWorkspaceSchema = z.object({ orders: z.array(adminCodOrderSchema), reconciliations: z.array(z.object({ id: uuidSchema, periodStart: timestampSchema, periodEnd: timestampSchema, expectedMinor: z.string().regex(/^\d+$/), receivedMinor: z.string().regex(/^\d+$/), varianceMinor: z.string().regex(/^-?\d+$/), currency: z.string().length(3), status: z.string(), itemCount: z.number().int().nonnegative(), createdAt: timestampSchema })), summary: z.object({ totalCod: z.number().int().nonnegative(), codValueMinor: z.string().regex(/^\d+$/), awaitingConfirmation: z.number().int().nonnegative(), confirmed: z.number().int().nonnegative(), waitingDelivery: z.number().int().nonnegative(), discrepancies: z.number().int().nonnegative(), remitted: z.number().int().nonnegative(), outstandingMinor: z.string().regex(/^-?\d+$/) }) });

export type CreatePayoutRequest = z.infer<typeof createPayoutRequestSchema>;
export type ReviewPayout = z.infer<typeof reviewPayoutSchema>;
export type CompletePayout = z.infer<typeof completePayoutSchema>;
export type CompleteRefund = z.infer<typeof completeRefundSchema>;
export type CodReconciliationInput = z.infer<typeof codReconciliationInputSchema>;
export type AdminCodDeliveryInput = z.infer<typeof adminCodDeliveryInputSchema>;
export type AdminCodConfirmationInput = z.infer<typeof adminCodConfirmationInputSchema>;
export type AdminCodWorkspaceDto = z.infer<typeof adminCodWorkspaceSchema>;
