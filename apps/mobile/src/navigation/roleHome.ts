import type { RoleHome } from "@amiyo/contracts";

export const roleHomes: RoleHome[] = [
  { role: "CUSTOMER", destination: "home" },
  { role: "VENDOR_OWNER", destination: "vendor-dashboard" },
  { role: "VENDOR_MANAGER", destination: "vendor-dashboard" },
  { role: "VENDOR_STAFF", destination: "vendor-orders" },
  { role: "SUPPORT_AGENT", destination: "support" },
  { role: "FINANCE_ADMIN", destination: "admin-queues" },
  { role: "OPERATIONS_ADMIN", destination: "admin-queues" },
  { role: "SUPER_ADMIN", destination: "admin-dashboard" }
];
