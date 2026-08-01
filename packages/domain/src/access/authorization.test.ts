import assert from "node:assert/strict";
import test from "node:test";
import { authorize, type AuthorizationContext } from "./authorization.js";

const vendorStaff: AuthorizationContext = {
  userId: "user-1",
  status: "ACTIVE",
  roles: ["VENDOR_STAFF"],
  vendorMemberships: [{ vendorId: "vendor-1", status: "active", permissions: ["orders:manage"] }]
};

test("suspended accounts cannot use granted permissions", () => {
  assert.equal(authorize({ ...vendorStaff, status: "SUSPENDED" }, { permission: "orders:manage", vendorId: "vendor-1" }), false);
});

test("vendor staff permission is limited to its active vendor", () => {
  assert.equal(authorize(vendorStaff, { permission: "orders:manage", vendorId: "vendor-1" }), true);
  assert.equal(authorize(vendorStaff, { permission: "orders:manage", vendorId: "vendor-2" }), false);
  assert.equal(authorize(vendorStaff, { permission: "products:manage", vendorId: "vendor-1" }), false);
});

test("resource ownership is enforced for customer data", () => {
  const customer: AuthorizationContext = { userId: "user-1", status: "ACTIVE", roles: ["CUSTOMER"], vendorMemberships: [] };
  assert.equal(authorize(customer, { permission: "orders:read", ownerUserId: "user-1", requireOwnership: true }), true);
  assert.equal(authorize(customer, { permission: "orders:read", ownerUserId: "user-2", requireOwnership: true }), false);
});

test("super admin bypasses resource scopes but not account status", () => {
  const admin: AuthorizationContext = { userId: "admin", status: "ACTIVE", roles: ["SUPER_ADMIN"], vendorMemberships: [] };
  assert.equal(authorize(admin, { permission: "settings:manage", vendorId: "missing" }), true);
  assert.equal(authorize({ ...admin, status: "DEACTIVATED" }, { permission: "settings:manage" }), false);
});
