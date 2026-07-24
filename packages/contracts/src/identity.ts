import { z } from "zod";

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
  userId: z.string().uuid(),
  roles: z.array(roleSchema),
  vendorIds: z.array(z.string().uuid()).default([])
});

export type Role = z.infer<typeof roleSchema>;
export type Principal = z.infer<typeof principalSchema>;
