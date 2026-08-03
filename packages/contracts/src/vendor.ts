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

export const vendorStaffSchema = z.object({ id: uuidSchema, userId: uuidSchema, displayName: z.string().nullable(), email: z.string().nullable(), role: z.string(), status: z.string(), permissions: z.array(z.string()) });
export const updateVendorStaffSchema = z.object({ status: z.enum(["active", "suspended"]), permissions: z.array(z.enum(["orders:read", "orders:manage", "products:manage", "inventory:manage", "finance:read", "support:manage"])).max(12) });
export const vendorVoucherSchema = z.object({ id: uuidSchema, code: z.string(), active: z.boolean(), startsAt: timestampSchema, endsAt: timestampSchema, version: versionSchema, rules: z.record(z.unknown()) });
export const createVendorVoucherSchema = z.object({ code: z.string().trim().min(3).max(40).transform((value) => value.toUpperCase()), discountType: z.enum(["PERCENT", "FIXED"]), value: z.number().int().positive(), startsAt: z.string().datetime(), endsAt: z.string().datetime() }).refine((value) => value.startsAt < value.endsAt, "startsAt must precede endsAt");
export const vendorReportSchema = z.object({ orderCount: z.number().int().nonnegative(), deliveredCount: z.number().int().nonnegative(), grossSalesMinor: z.string(), productCount: z.number().int().nonnegative(), lowStockCount: z.number().int().nonnegative(), statusCounts: z.record(z.number().int().nonnegative()), recentOrders: z.array(z.object({ id: uuidSchema, status: z.string(), totalMinor: z.string(), createdAt: timestampSchema })) });

export type UpdateVendorShop = z.infer<typeof updateVendorShopSchema>;
export type SubmitVendorKyc = z.infer<typeof submitVendorKycSchema>;
export type SaveVendorBankAccount = z.infer<typeof saveVendorBankAccountSchema>;
export type UpdateVendorStaff = z.infer<typeof updateVendorStaffSchema>;
export type CreateVendorVoucher = z.infer<typeof createVendorVoucherSchema>;
