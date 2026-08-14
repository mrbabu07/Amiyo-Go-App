import assert from "node:assert/strict";
import test from "node:test";
import { adminAnalyticsQuerySchema, adminBannerInputSchema, adminCategoryAttributesInputSchema, adminCategoryInputSchema, adminCategoryRequestReviewSchema, adminFlashSaleInputSchema, adminKycReviewInputSchema, adminUserRolesInputSchema, adminUserStatusInputSchema, adminVoucherInputSchema, paymentVerificationReviewSchema, trustCaseActionInputSchema } from "./admin.js";

test("admin user status mutations require an operational reason", () => {
  assert.equal(adminUserStatusInputSchema.parse({ status: "SUSPENDED", reason: "Fraud review" }).status, "SUSPENDED");
  assert.throws(() => adminUserStatusInputSchema.parse({ status: "SUSPENDED", reason: "no" }));
});

test("platform staff roles are bounded and unique", () => {
  assert.deepEqual(adminUserRolesInputSchema.parse({ roles: ["SUPPORT_AGENT", "FINANCE_ADMIN"], reason: "Operations staffing change" }).roles, ["SUPPORT_AGENT", "FINANCE_ADMIN"]);
  assert.throws(() => adminUserRolesInputSchema.parse({ roles: ["CUSTOMER"], reason: "Operations staffing change" }));
  assert.throws(() => adminUserRolesInputSchema.parse({ roles: ["SUPPORT_AGENT", "SUPPORT_AGENT"], reason: "Operations staffing change" }));
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
test("category request reviews use final bounded decisions", () => { assert.equal(adminCategoryRequestReviewSchema.safeParse({ status: "approved", reason: "Catalog verified" }).success, true); assert.equal(adminCategoryRequestReviewSchema.safeParse({ status: "pending", reason: "Wait" }).success, false); });
test("banner schedules and destinations remain valid", () => { const valid = { title: "Eid offers", placement: "home_hero", storageKey: "https://example.com/banner.jpg", targetType: "route", targetValue: "/search", startsAt: "2026-08-05T00:00:00.000Z", endsAt: "2026-08-20T00:00:00.000Z" }; assert.equal(adminBannerInputSchema.safeParse(valid).success, true); assert.equal(adminBannerInputSchema.safeParse({ ...valid, endsAt: valid.startsAt }).success, false); assert.equal(adminBannerInputSchema.safeParse({ ...valid, targetValue: null }).success, false); });
test("admin marketing rules enforce safe discounts and unique flash products", () => { const startsAt = "2026-08-15T00:00:00.000Z"; const endsAt = "2026-08-20T00:00:00.000Z"; assert.equal(adminVoucherInputSchema.safeParse({ code: " amiyo20 ", discountType: "PERCENT", value: 20, startsAt, endsAt }).success, true); assert.equal(adminVoucherInputSchema.safeParse({ code: "BAD200", discountType: "PERCENT", value: 200, startsAt, endsAt }).success, false); const product = { productId: "00000000-0000-4000-8000-000000000401", priceMinor: "199000", quantityLimit: 25 }; assert.equal(adminFlashSaleInputSchema.safeParse({ name: "Mega flash", startsAt, endsAt, products: [product] }).success, true); assert.equal(adminFlashSaleInputSchema.safeParse({ name: "Mega flash", startsAt, endsAt, products: [product, product] }).success, false); });
