export const permissions = [
  "catalog:read",
  "cart:manage",
  "checkout:manage",
  "orders:read",
  "orders:manage",
  "returns:manage",
  "reviews:manage",
  "support:manage",
  "vendor:read",
  "vendor:manage",
  "products:manage",
  "inventory:manage",
  "finance:read",
  "finance:manage",
  "kyc:manage",
  "admin:read",
  "admin:manage",
  "audit:read",
  "settings:manage"
] as const;

export const roles = [
  "CUSTOMER",
  "VENDOR_OWNER",
  "VENDOR_MANAGER",
  "VENDOR_STAFF",
  "SUPPORT_AGENT",
  "FINANCE_ADMIN",
  "OPERATIONS_ADMIN",
  "SUPER_ADMIN"
] as const;

export type Permission = (typeof permissions)[number];
export type Role = (typeof roles)[number];

const rolePermissionMap: Record<Role, Permission[]> = {
  CUSTOMER: [
    "catalog:read",
    "cart:manage",
    "checkout:manage",
    "orders:read",
    "returns:manage",
    "reviews:manage",
    "support:manage"
  ],
  VENDOR_OWNER: [
    "vendor:read",
    "vendor:manage",
    "products:manage",
    "inventory:manage",
    "orders:read",
    "orders:manage",
    "finance:read",
    "finance:manage",
    "kyc:manage",
    "support:manage"
  ],
  VENDOR_MANAGER: [
    "vendor:read",
    "vendor:manage",
    "products:manage",
    "inventory:manage",
    "orders:read",
    "orders:manage",
    "finance:read",
    "support:manage"
  ],
  VENDOR_STAFF: ["vendor:read", "orders:read", "orders:manage", "products:manage", "support:manage"],
  SUPPORT_AGENT: ["orders:read", "support:manage", "admin:read"],
  FINANCE_ADMIN: ["orders:read", "finance:read", "finance:manage", "audit:read", "admin:read"],
  OPERATIONS_ADMIN: [
    "catalog:read",
    "products:manage",
    "inventory:manage",
    "orders:read",
    "orders:manage",
    "returns:manage",
    "admin:read",
    "admin:manage"
  ],
  SUPER_ADMIN: [...permissions]
};

export function getRolePermissions(role: Role): Permission[] {
  return rolePermissionMap[role];
}

export function hasPermission(roleList: Role[], permission: Permission): boolean {
  return roleList.some((role) => rolePermissionMap[role].includes(permission));
}
