import { z } from "zod";
import { roleSchema } from "./identity.js";

export const navigationDestinationSchema = z.enum([
  "home",
  "categories",
  "cart",
  "orders",
  "account",
  "vendor-dashboard",
  "vendor-orders",
  "vendor-products",
  "vendor-finance",
  "admin-dashboard",
  "admin-queues",
  "admin-audit",
  "support"
]);

export const roleHomeSchema = z.object({
  role: roleSchema,
  destination: navigationDestinationSchema
});

export type NavigationDestination = z.infer<typeof navigationDestinationSchema>;
export type RoleHome = z.infer<typeof roleHomeSchema>;
