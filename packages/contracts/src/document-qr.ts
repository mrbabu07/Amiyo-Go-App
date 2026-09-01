import { z } from "zod";
import { moneySchema, timestampSchema } from "./common.js";

export const documentQrPayloadSchema = z.string().min(40).max(2_000).refine((value) => value.startsWith("AGP2|") || value.startsWith("AGI1|"), "Unsupported Amiyo document QR payload");
export const documentQrVerificationInputSchema = z.object({ payload: documentQrPayloadSchema });

const parcelClaimsSchema = z.object({
  type: z.literal("parcel"),
  orderId: z.string(),
  vendorId: z.string(),
  vendorOrderId: z.string(),
  trackingNumber: z.string(),
  paymentMode: z.enum(["C", "P", "U"]),
  paymentStatus: z.string(),
  orderStatus: z.string(),
  amount: moneySchema,
  itemCount: z.number().int().nonnegative(),
  quantity: z.number().int().nonnegative(),
  expiresAt: timestampSchema
});

const invoiceClaimsSchema = z.object({
  type: z.literal("invoice"),
  invoiceId: z.string(),
  invoiceNumber: z.string(),
  orderId: z.string(),
  orderNumber: z.string(),
  total: moneySchema,
  issuedAt: timestampSchema,
  expiresAt: timestampSchema
});

export const documentQrVerificationSchema = z.discriminatedUnion("valid", [
  z.object({ valid: z.literal(false), reason: z.enum(["EXPIRED", "INVALID_FORMAT", "INVALID_SIGNATURE", "UNSUPPORTED_VERSION"]) }),
  z.object({ valid: z.literal(true), claims: z.discriminatedUnion("type", [parcelClaimsSchema, invoiceClaimsSchema]), currentRecord: z.object({ matches: z.boolean(), reference: z.string(), status: z.string(), checkedAt: timestampSchema }) })
]);

export type DocumentQrVerificationInput = z.infer<typeof documentQrVerificationInputSchema>;
export type DocumentQrVerification = z.infer<typeof documentQrVerificationSchema>;
