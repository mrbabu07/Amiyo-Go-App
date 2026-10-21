import assert from "node:assert/strict";
import test from "node:test";
import { canAccessVendorPath, filterVendorTargets, vendorPermissionForPath } from "./vendor-navigation";

test("seller navigation maps sensitive workspaces to server permissions", () => {
  assert.equal(vendorPermissionForPath("/vendor/products/edit/product-id"), "products:manage");
  assert.equal(vendorPermissionForPath("/vendor/order/order-id/documents"), "orders:read");
  assert.equal(vendorPermissionForPath("/vendor/finance/payouts"), "finance:read");
  assert.equal(vendorPermissionForPath("/vendor/payout-settings"), "finance:manage");
  assert.equal(vendorPermissionForPath("/vendor/staff"), "vendor:manage");
});

test("delegated seller staff only see granted workspace targets", () => {
  const targets = [
    { href: "/vendor/dashboard", label: "Dashboard" },
    { href: "/vendor/products", label: "Products" },
    { href: "/vendor/orders", label: "Orders" },
    { href: "/vendor/finance", label: "Finance" }
  ];
  const visible = filterVendorTargets(targets, ["vendor:read", "orders:read"]);
  assert.deepEqual(visible.map((item) => item.label), ["Dashboard", "Orders"]);
  assert.equal(canAccessVendorPath("/vendor/finance", ["vendor:read"]), false);
});
