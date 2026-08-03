import { z } from "zod";
import { timestampSchema, uuidSchema, versionSchema } from "./common.js";

export const vendorShopSchema = z.object({
  id: uuidSchema,
  vendorId: uuidSchema,
  name: z.string(),
  slug: z.string(),
  status: z.enum(["DRAFT", "ACTIVE", "PAUSED", "CLOSED"]),
  description: z.string().nullable(),
  settings: z.record(z.unknown()).nullable(),
  version: versionSchema
});

export const vendorKycDocumentInputSchema = z.object({
  documentType: z.enum(["NID_FRONT", "NID_BACK", "TRADE_LICENSE", "BANK_PROOF", "OTHER"]),
  storageKey: z.string().trim().min(3).max(500),
  mimeType: z.string().trim().min(3).max(100),
  checksum: z.string().trim().min(16).max(128)
});

export const vendorKycSubmissionSchema = z.object({
  id: uuidSchema,
  status: z.enum(["DRAFT", "SUBMITTED", "REVIEWING", "APPROVED", "REJECTED"]),
  submittedAt: timestampSchema.nullable(),
  reviewedAt: timestampSchema.nullable(),
  rejectionReason: z.string().nullable(),
  documents: z.array(z.object({ id: uuidSchema, documentType: z.string(), storageKey: z.string(), mimeType: z.string() }))
});

export const vendorBankAccountSchema = z.object({ id: uuidSchema, provider: z.string(), accountName: z.string(), accountNumberMasked: z.string(), isDefault: z.boolean(), verifiedAt: timestampSchema.nullable() });
export const vendorWorkspaceSchema = z.object({
  id: uuidSchema,
  legalName: z.string(),
  displayName: z.string(),
  status: z.enum(["PENDING", "APPROVED", "REJECTED", "SUSPENDED"]),
  version: versionSchema,
  shops: z.array(vendorShopSchema),
  kycSubmissions: z.array(vendorKycSubmissionSchema),
  bankAccounts: z.array(vendorBankAccountSchema)
});

export const updateVendorShopSchema = z.object({
  version: versionSchema,
  name: z.string().trim().min(3).max(160).optional(),
  description: z.string().trim().max(3000).nullable().optional(),
  settings: z.record(z.unknown()).nullable().optional()
}).refine((input) => Object.keys(input).length > 1, "At least one shop field is required");

export const submitVendorKycSchema = z.object({ documents: z.array(vendorKycDocumentInputSchema).min(1).max(10) });
export const saveVendorBankAccountSchema = z.object({
  provider: z.enum(["BANK", "BKASH", "NAGAD", "ROCKET"]),
  accountName: z.string().trim().min(2).max(160),
  accountNumber: z.string().trim().min(8).max(40),
  isDefault: z.boolean().default(true)
});

export type UpdateVendorShop = z.infer<typeof updateVendorShopSchema>;
export type SubmitVendorKyc = z.infer<typeof submitVendorKycSchema>;
export type SaveVendorBankAccount = z.infer<typeof saveVendorBankAccountSchema>;
