import { z } from "zod";
import { timestampSchema, uuidSchema, versionSchema } from "./common.js";

export const adminUserSchema = z.object({ id: uuidSchema, email: z.string().nullable(), phone: z.string().nullable(), displayName: z.string().nullable(), status: z.enum(["ACTIVE", "SUSPENDED", "DEACTIVATED", "ANONYMIZED"]), roles: z.array(z.string()), createdAt: timestampSchema });
export const adminUserStatusInputSchema = z.object({ status: z.enum(["ACTIVE", "SUSPENDED", "DEACTIVATED"]), reason: z.string().trim().min(3).max(500) });
export const adminVendorSchema = z.object({ id: uuidSchema, legalName: z.string(), displayName: z.string(), status: z.enum(["PENDING", "APPROVED", "REJECTED", "SUSPENDED"]), version: versionSchema, memberCount: z.number().int().nonnegative(), shopCount: z.number().int().nonnegative(), latestKycStatus: z.string().nullable(), createdAt: timestampSchema });
export const adminVendorStatusInputSchema = z.object({ status: z.enum(["APPROVED", "REJECTED", "SUSPENDED"]), reason: z.string().trim().min(3).max(500) });
export const adminKycSubmissionSchema = z.object({ id: uuidSchema, vendorId: uuidSchema, vendorName: z.string(), status: z.enum(["DRAFT", "SUBMITTED", "REVIEWING", "APPROVED", "REJECTED"]), submittedAt: timestampSchema.nullable(), rejectionReason: z.string().nullable(), documents: z.array(z.object({ id: uuidSchema, documentType: z.string(), storageKey: z.string(), mimeType: z.string() })) });
export const adminKycReviewInputSchema = z.object({ status: z.enum(["REVIEWING", "APPROVED", "REJECTED"]), reason: z.string().trim().min(3).max(500).optional() }).refine((value) => value.status !== "REJECTED" || Boolean(value.reason), "A rejection reason is required");
export const trustCaseSchema = z.object({ id: uuidSchema, subjectType: z.string(), subjectId: z.string(), caseType: z.string(), severity: z.string(), status: z.string(), assignedTo: uuidSchema.nullable(), summary: z.string(), createdAt: timestampSchema, actions: z.array(z.object({ id: uuidSchema, actionType: z.string(), actorUserId: uuidSchema, reason: z.string(), createdAt: timestampSchema })) });
export const trustCaseActionInputSchema = z.object({ action: z.enum(["INVESTIGATE", "RESOLVE", "CLOSE"]), reason: z.string().trim().min(3).max(1000) });
export const adminWorkspaceSchema = z.object({ users: z.array(adminUserSchema), vendors: z.array(adminVendorSchema), kyc: z.array(adminKycSubmissionSchema), trustCases: z.array(trustCaseSchema) });
export const paymentVerificationSchema = z.object({ id: uuidSchema, paymentId: uuidSchema, orderId: uuidSchema, orderNumber: z.string(), provider: z.string(), amountMinor: z.string(), currency: z.string(), status: z.string(), transactionRef: z.string(), senderMasked: z.string().nullable(), evidenceStorageKey: z.string().nullable(), createdAt: timestampSchema });
export const paymentVerificationReviewSchema = z.object({ status: z.enum(["approved", "rejected"]), reason: z.string().trim().min(3).max(500) });
export const adminCategoryInputSchema = z.object({ name: z.string().trim().min(2).max(120), slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/), description: z.string().trim().max(1000).nullable().optional(), displayOrder: z.number().int().default(0) });
export const adminToggleInputSchema = z.object({ active: z.boolean() });
export const adminPlatformSchema = z.object({
  paymentVerifications: z.array(paymentVerificationSchema),
  categories: z.array(z.object({ id: uuidSchema, name: z.string(), slug: z.string(), status: z.string(), displayOrder: z.number().int(), productCount: z.number().int().nonnegative() })),
  banners: z.array(z.object({ id: uuidSchema, title: z.string().nullable(), placement: z.string(), active: z.boolean(), startsAt: timestampSchema, endsAt: timestampSchema })),
  vouchers: z.array(z.object({ id: uuidSchema, code: z.string(), ownerType: z.string(), active: z.boolean(), startsAt: timestampSchema, endsAt: timestampSchema })),
  flashSales: z.array(z.object({ id: uuidSchema, name: z.string(), status: z.string(), startsAt: timestampSchema, endsAt: timestampSchema, productCount: z.number().int().nonnegative() })),
  audit: z.array(z.object({ id: uuidSchema, actorType: z.string(), action: z.string(), resourceType: z.string(), resourceId: z.string(), createdAt: timestampSchema }))
});

export type AdminUserStatusInput = z.infer<typeof adminUserStatusInputSchema>;
export type AdminVendorStatusInput = z.infer<typeof adminVendorStatusInputSchema>;
export type AdminKycReviewInput = z.infer<typeof adminKycReviewInputSchema>;
export type TrustCaseActionInput = z.infer<typeof trustCaseActionInputSchema>;
export type PaymentVerificationReview = z.infer<typeof paymentVerificationReviewSchema>;
export type AdminCategoryInput = z.infer<typeof adminCategoryInputSchema>;
