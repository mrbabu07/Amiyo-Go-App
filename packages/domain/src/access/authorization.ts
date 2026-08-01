import { hasPermission, type Permission, type Role } from "./permissions.js";

export interface VendorScope {
  vendorId: string;
  status: string;
  permissions: string[];
}

export interface AuthorizationContext {
  userId: string;
  status: "ACTIVE" | "SUSPENDED" | "DEACTIVATED" | "ANONYMIZED";
  roles: Role[];
  vendorMemberships: VendorScope[];
}

export interface AuthorizationRequest {
  permission: Permission;
  vendorId?: string;
  ownerUserId?: string;
  requireOwnership?: boolean;
}

const vendorRoles = new Set<Role>(["VENDOR_OWNER", "VENDOR_MANAGER", "VENDOR_STAFF"]);

export function authorize(context: AuthorizationContext, request: AuthorizationRequest) {
  if (context.status !== "ACTIVE") return false;
  if (context.roles.includes("SUPER_ADMIN")) return true;
  if (request.requireOwnership && request.ownerUserId !== context.userId) return false;
  if (!hasPermission(context.roles, request.permission)) return false;
  if (!request.vendorId) return true;

  const membership = context.vendorMemberships.find((candidate) => candidate.vendorId === request.vendorId && candidate.status === "active");
  if (!membership) return false;
  const vendorOnly = context.roles.every((role) => vendorRoles.has(role) || role === "CUSTOMER");
  if (!vendorOnly) return true;
  if (context.roles.includes("VENDOR_OWNER")) return true;
  return membership.permissions.includes(request.permission);
}
