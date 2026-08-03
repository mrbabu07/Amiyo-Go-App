import assert from "node:assert/strict";
import test from "node:test";
import { adminKycReviewInputSchema, adminUserStatusInputSchema, trustCaseActionInputSchema } from "./admin.js";

test("admin user status mutations require an operational reason", () => {
  assert.equal(adminUserStatusInputSchema.parse({ status: "SUSPENDED", reason: "Fraud review" }).status, "SUSPENDED");
  assert.throws(() => adminUserStatusInputSchema.parse({ status: "SUSPENDED", reason: "no" }));
});

test("KYC rejection cannot omit its reason", () => {
  assert.throws(() => adminKycReviewInputSchema.parse({ status: "REJECTED" }));
  assert.equal(adminKycReviewInputSchema.parse({ status: "APPROVED" }).status, "APPROVED");
});

test("trust actions use a bounded workflow", () => {
  assert.equal(trustCaseActionInputSchema.parse({ action: "RESOLVE", reason: "Evidence reviewed" }).action, "RESOLVE");
  assert.throws(() => trustCaseActionInputSchema.parse({ action: "DELETE", reason: "Evidence reviewed" }));
});
