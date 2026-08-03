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

export type AdminUserStatusInput = z.infer<typeof adminUserStatusInputSchema>;
export type AdminVendorStatusInput = z.infer<typeof adminVendorStatusInputSchema>;
export type AdminKycReviewInput = z.infer<typeof adminKycReviewInputSchema>;
export type TrustCaseActionInput = z.infer<typeof trustCaseActionInputSchema>;
