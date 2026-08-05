import { z } from "zod";
import { timestampSchema, uuidSchema } from "./common.js";

export const mediaPurposeSchema = z.enum(["avatar", "product", "shop", "banner", "review", "kyc", "payment_evidence", "return_evidence"]);
export const mediaUploadInputSchema = z.object({ purpose: mediaPurposeSchema, fileName: z.string().trim().min(1).max(180), mimeType: z.enum(["image/jpeg", "image/png", "image/webp", "application/pdf"]), size: z.number().int().positive().max(15_000_000), checksum: z.string().regex(/^[a-f0-9]{64}$/i).nullable().optional() }).superRefine((value, context) => { if (value.mimeType.startsWith("image/") && value.size > 10_000_000) context.addIssue({ code: "custom", message: "Images must not exceed 10 MB", path: ["size"] }); if (value.mimeType === "application/pdf" && !["kyc", "payment_evidence", "return_evidence"].includes(value.purpose)) context.addIssue({ code: "custom", message: "PDF is not allowed for this purpose", path: ["mimeType"] }); });
export const mediaUploadTicketSchema = z.object({ id: uuidSchema, storageKey: z.string(), uploadUrl: z.string().url(), method: z.literal("PUT"), headers: z.record(z.string()), expiresAt: timestampSchema });
export const mediaUploadResultSchema = z.object({ id: uuidSchema, storageKey: z.string(), status: z.enum(["uploaded", "processing", "ready"]), publicUrl: z.string().url().nullable() });
export const mediaProcessingJobSchema = z.object({ mediaUploadId: uuidSchema, storageKey: z.string().min(3) });

export type MediaUploadInput = z.infer<typeof mediaUploadInputSchema>;
export type MediaUploadTicket = z.infer<typeof mediaUploadTicketSchema>;
export type MediaUploadResult = z.infer<typeof mediaUploadResultSchema>;
export type MediaProcessingJob = z.infer<typeof mediaProcessingJobSchema>;
