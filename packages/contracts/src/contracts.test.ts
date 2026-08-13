import assert from "node:assert/strict";
import test from "node:test";
import { addCartItemSchema, addressInputSchema, catalogQuerySchema, checkoutInputSchema, commissionRuleInputSchema, createOpenApiDocument, createProductSchema, createReturnSchema, deviceInputSchema, minorUnitSchema, moneySchema, productReportInputSchema, vendorOrderStatusSchema, vendorRegistrationSchema } from "./index.js";

test("money contracts preserve bigint-safe minor units", () => {
  assert.deepEqual(moneySchema.parse({ amountMinor: "249000", currency: "bdt" }), { amountMinor: "249000", currency: "BDT" });
  assert.equal(minorUnitSchema.safeParse(-1).success, false);
  assert.equal(minorUnitSchema.safeParse("12.50").success, false);
});

test("vendor order contract follows the approved state machine", () => {
  assert.equal(vendorOrderStatusSchema.safeParse("PLACED").success, true);
  assert.equal(vendorOrderStatusSchema.safeParse("PACKED").success, false);
});

test("OpenAPI document exposes typed v2 resources", () => {
  const document = createOpenApiDocument();
  assert.equal(document.openapi, "3.1.0");
  assert.ok(document.paths?.["/api/v2/catalog/products"]);
  assert.ok(document.paths?.["/api/v2/orders/{id}"]);
  assert.ok(document.paths?.["/api/v2/auth/session"]);
  assert.ok(document.paths?.["/api/v2/me/addresses"]);
  assert.ok(document.paths?.["/api/v2/me/export"]);
  assert.ok(document.paths?.["/api/v2/cart"]);
  assert.ok(document.paths?.["/api/v2/checkout/orders"]);
  assert.ok(document.paths?.["/api/v2/vendor/orders/{id}/transitions"]);
  assert.ok(document.paths?.["/api/v2/orders/{id}/tracking"]);
  assert.ok(document.paths?.["/api/v2/orders/{id}/invoice"]);
  assert.ok(document.paths?.["/api/v2/returns"]);
  assert.ok(document.paths?.["/api/v2/vendor/finance"]);
  assert.ok(document.paths?.["/api/v2/admin/cod/reconciliations"]);
  assert.ok(document.paths?.["/api/v2/growth/feed"]);
  assert.ok(document.paths?.["/api/v2/wishlist"]);
  assert.ok(document.paths?.["/api/v2/wishlist/share"]);
  assert.ok(document.paths?.["/api/v2/wishlists/shared/{token}"]);
  assert.ok(document.paths?.["/api/v2/notifications"]);
  assert.ok(document.paths?.["/api/v2/chat/threads"]);
  assert.ok(document.paths?.["/api/v2/admin/workspace/categories/{id}/attributes"]);
  assert.ok(document.paths?.["/api/v2/admin/workspace/analytics"]);
  assert.ok(document.paths?.["/api/v2/vendor/products/import"]);
  assert.ok(document.paths?.["/api/v2/vendor/products/export.csv"]);
  assert.ok(document.paths?.["/api/v2/vendor/workspace/category-requests"]);
  assert.ok(document.paths?.["/api/v2/vendor/registrations"]);
  assert.ok(document.paths?.["/api/v2/admin/workspace/category-requests/{id}"]);
  assert.ok(document.paths?.["/api/v2/vendor/orders/{id}/documents"]);
  assert.ok(document.paths?.["/api/v2/media/uploads"]);
  assert.ok(document.paths?.["/api/v2/catalog/products/{productId}/reports"]);
});

test("product reports use bounded trust reasons and evidence", () => {
  assert.equal(productReportInputSchema.safeParse({ reason: "counterfeit", details: "Logo and serial number appear fake" }).success, true);
  assert.equal(productReportInputSchema.safeParse({ reason: "spam", details: "Invalid reason" }).success, false);
});

test("vendor registration requires consent and unique categories", () => {
  const categoryId = crypto.randomUUID();
  const base = { legalName: "Example Commerce", displayName: "Example Shop", phone: "01700000000", address: { line1: "Road 1", division: "Dhaka", district: "Dhaka", upazila: "Savar" }, categoryIds: [categoryId], termsVersion: "2026.06", privacyVersion: "2026.06" };
  assert.equal(vendorRegistrationSchema.safeParse({ ...base, acceptedTerms: true }).success, true);
  assert.equal(vendorRegistrationSchema.safeParse({ ...base, acceptedTerms: false }).success, false);
  assert.equal(vendorRegistrationSchema.safeParse({ ...base, acceptedTerms: true, categoryIds: [categoryId, categoryId] }).success, false);
});

test("return contracts reject duplicate items and invalid quantities", () => {
  const item = { orderItemId: crypto.randomUUID(), quantity: 1 };
  assert.equal(createReturnSchema.safeParse({ vendorOrderId: crypto.randomUUID(), reasonCode: "damaged", items: [item] }).success, true);
  assert.equal(createReturnSchema.safeParse({ vendorOrderId: crypto.randomUUID(), reasonCode: "damaged", items: [item, item] }).success, false);
});

test("commerce contracts enforce quantities and supported payments", () => {
  assert.equal(addCartItemSchema.safeParse({ variantId: crypto.randomUUID(), quantity: 0 }).success, false);
  assert.equal(checkoutInputSchema.safeParse({ addressId: crypto.randomUUID(), paymentMethod: "BKASH" }).success, true);
  assert.equal(checkoutInputSchema.safeParse({ addressId: crypto.randomUUID(), paymentMethod: "BITCOIN" }).success, false);
});

test("identity mutation contracts reject incomplete data", () => {
  assert.equal(addressInputSchema.safeParse({ label: "Home" }).success, false);
  assert.equal(deviceInputSchema.safeParse({ installationId: "install-123", platform: "web", pushToken: "token-value" }).success, false);
});

test("commission rules require bounded non-zero fees and valid dates", () => {
  const base = { vendorId: null, categoryId: null, rateBps: 750, fixedMinor: "0", currency: "BDT", effectiveFrom: new Date().toISOString(), effectiveTo: null };
  assert.equal(commissionRuleInputSchema.safeParse(base).success, true);
  assert.equal(commissionRuleInputSchema.safeParse({ ...base, rateBps: 0 }).success, false);
  assert.equal(commissionRuleInputSchema.safeParse({ ...base, rateBps: 5001 }).success, false);
});

test("catalog contracts enforce bounded pagination and integer money", () => {
  assert.equal(catalogQuerySchema.safeParse({ limit: 51 }).success, false);
  assert.equal(catalogQuerySchema.parse({ limit: 20, query: " headphones " }).query, "headphones");
  assert.equal(createProductSchema.safeParse({ shopId: crypto.randomUUID(), categoryId: crypto.randomUUID(), name: "Test product", slug: "test-product", variants: [{ sku: "SKU-1", title: "Default", priceMinor: "12.50" }] }).success, false);
});
