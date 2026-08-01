import assert from "node:assert/strict";
import test from "node:test";
import { hasPermission } from "./permissions.js";

test("super admin can access platform settings", () => {
  assert.equal(hasPermission(["SUPER_ADMIN"], "settings:manage"), true);
});

test("customer cannot manage vendor finance", () => {
  assert.equal(hasPermission(["CUSTOMER"], "finance:manage"), false);
});

test("vendor owner can manage KYC", () => {
  assert.equal(hasPermission(["VENDOR_OWNER"], "kyc:manage"), true);
});
