import { z } from "zod";
import { timestampSchema, uuidSchema } from "./common.js";

export const roleSchema = z.enum([
  "CUSTOMER",
  "VENDOR_OWNER",
  "VENDOR_MANAGER",
  "VENDOR_STAFF",
  "SUPPORT_AGENT",
  "FINANCE_ADMIN",
  "OPERATIONS_ADMIN",
  "SUPER_ADMIN"
]);

export const principalSchema = z.object({
  userId: uuidSchema,
  roles: z.array(roleSchema),
  vendorIds: z.array(uuidSchema).default([])
});

export const userStatusSchema = z.enum(["ACTIVE", "SUSPENDED", "DEACTIVATED", "ANONYMIZED"]);

export const profileSchema = z.object({
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
  displayName: z.string().nullable(),
  avatarStorageKey: z.string().nullable(),
  locale: z.string(),
  currency: z.string().length(3)
});

export const updateProfileSchema = z.object({
  firstName: z.string().trim().min(1).max(80).nullable().optional(),
  lastName: z.string().trim().min(1).max(80).nullable().optional(),
  displayName: z.string().trim().min(1).max(120).nullable().optional(),
  locale: z.enum(["en", "bn"]).optional(),
  currency: z.string().length(3).transform((value) => value.toUpperCase()).optional()
}).refine((value) => Object.keys(value).length > 0, "At least one profile field is required");

export const vendorMembershipSchema = z.object({
  vendorId: uuidSchema,
  role: roleSchema,
  permissions: z.array(z.string())
});

export const sessionSchema = z.object({
  principal: principalSchema,
  status: userStatusSchema,
  email: z.string().email().nullable(),
  phone: z.string().nullable(),
  profile: profileSchema,
  permissions: z.array(z.string()),
  vendorMemberships: z.array(vendorMembershipSchema)
});

export const addressInputSchema = z.object({
  label: z.string().trim().min(1).max(40),
  recipientName: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(8).max(20),
  line1: z.string().trim().min(3).max(240),
  line2: z.string().trim().max(240).nullable().optional(),
  division: z.string().trim().min(2).max(80),
  district: z.string().trim().min(2).max(80),
  upazila: z.string().trim().max(80).nullable().optional(),
  unionName: z.string().trim().max(80).nullable().optional(),
  postalCode: z.string().trim().max(20).nullable().optional(),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
  isDefault: z.boolean().default(false)
});

export const addressSchema = addressInputSchema.extend({
  id: uuidSchema,
  createdAt: timestampSchema,
  updatedAt: timestampSchema
});

export const deviceInputSchema = z.object({
  installationId: z.string().trim().min(8).max(200),
  platform: z.enum(["android", "ios", "web"]),
  appVersion: z.string().trim().max(40).nullable().optional(),
  pushToken: z.string().trim().min(10).max(512).optional(),
  pushProvider: z.enum(["expo", "fcm", "apns"]).optional()
}).refine((value) => Boolean(value.pushToken) === Boolean(value.pushProvider), {
  message: "pushToken and pushProvider must be supplied together"
});

export const deviceSchema = z.object({
  id: uuidSchema,
  installationId: z.string(),
  platform: z.string(),
  appVersion: z.string().nullable(),
  revokedAt: timestampSchema.nullable(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema
});

export type Role = z.infer<typeof roleSchema>;
export type Principal = z.infer<typeof principalSchema>;
export type Session = z.infer<typeof sessionSchema>;
export type UpdateProfile = z.infer<typeof updateProfileSchema>;
export type AddressInput = z.infer<typeof addressInputSchema>;
export type Address = z.infer<typeof addressSchema>;
export type DeviceInput = z.infer<typeof deviceInputSchema>;
