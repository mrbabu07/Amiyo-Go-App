import assert from "node:assert/strict";
import test from "node:test";
import { adminAnalyticsQuerySchema, adminCategoryAttributesInputSchema, adminCategoryInputSchema, adminKycReviewInputSchema, adminUserStatusInputSchema, paymentVerificationReviewSchema, trustCaseActionInputSchema } from "./admin.js";

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
test("payment rejection requires a review reason", () => { assert.equal(paymentVerificationReviewSchema.parse({ status: "approved", reason: "Evidence verified" }).status, "approved"); assert.throws(() => paymentVerificationReviewSchema.parse({ status: "rejected", reason: "no" })); });
test("admin category slugs remain URL safe", () => { assert.equal(adminCategoryInputSchema.parse({ name: "Home Appliances", slug: "home-appliances" }).displayOrder, 0); assert.throws(() => adminCategoryInputSchema.parse({ name: "Home Appliances", slug: "Home Appliances" })); });
test("dynamic category attributes reject ambiguous configurations", () => {
  assert.equal(adminCategoryAttributesInputSchema.safeParse({ attributes: [{ key: "size", label: "Size", dataType: "select", options: ["Small", "Large"] }] }).success, true);
  assert.equal(adminCategoryAttributesInputSchema.safeParse({ attributes: [{ key: "size", label: "Size", dataType: "select", options: [] }] }).success, false);
  assert.equal(adminCategoryAttributesInputSchema.safeParse({ attributes: [{ key: "size", label: "Size", dataType: "text" }, { key: "size", label: "Other size", dataType: "text" }] }).success, false);
});
test("admin analytics uses bounded reporting windows", () => { assert.equal(adminAnalyticsQuerySchema.parse({}).range, "30d"); assert.equal(adminAnalyticsQuerySchema.parse({ range: "90d" }).range, "90d"); assert.throws(() => adminAnalyticsQuerySchema.parse({ range: "all" })); });
