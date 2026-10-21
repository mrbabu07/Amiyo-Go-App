export type VendorNavigationTarget = { href: string };

const routePermissions = [
  ["/vendor/products", "products:manage"],
  ["/vendor/bulk-products", "products:manage"],
  ["/vendor/inventory", "inventory:manage"],
  ["/vendor/category-requests", "products:manage"],
  ["/vendor/orders", "orders:read"],
  ["/vendor/order", "orders:read"],
  ["/vendor/returns", "orders:read"],
  ["/vendor/payout-settings", "finance:manage"],
  ["/vendor/finance", "finance:read"],
  ["/vendor/reports", "finance:read"],
  ["/vendor/marketing", "vendor:manage"],
  ["/vendor/shop", "vendor:manage"],
  ["/vendor/staff", "vendor:manage"],
  ["/vendor/settings", "vendor:manage"],
  ["/vendor/kyc", "kyc:manage"],
  ["/vendor/reviews", "support:manage"],
  ["/vendor/questions", "support:manage"],
  ["/vendor/qa", "support:manage"],
  ["/vendor/messages", "support:manage"],
  ["/vendor/support", "support:manage"],
  ["/vendor/operations", "vendor:read"],
  ["/vendor/notifications", "vendor:read"],
  ["/vendor/university", "vendor:read"],
  ["/vendor/dashboard", "vendor:read"]
] as const;

export function vendorPermissionForPath(pathname: string) {
  const path = pathname.split("?")[0]?.replace(/\/$/, "") || "/vendor/dashboard";
  return routePermissions
    .filter(([prefix]) => path === prefix || path.startsWith(`${prefix}/`))
    .sort(([left], [right]) => right.length - left.length)[0]?.[1] ?? "vendor:read";
}

export function canAccessVendorPath(pathname: string, permissions: readonly string[]) {
  return permissions.includes(vendorPermissionForPath(pathname));
}

export function filterVendorTargets<T extends VendorNavigationTarget>(targets: readonly T[], permissions: readonly string[]) {
  return targets.filter((target) => canAccessVendorPath(target.href, permissions));
}
