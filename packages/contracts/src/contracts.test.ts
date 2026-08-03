import assert from "node:assert/strict";
import test from "node:test";
import { addCartItemSchema, addressInputSchema, catalogQuerySchema, checkoutInputSchema, createOpenApiDocument, createProductSchema, createReturnSchema, deviceInputSchema, minorUnitSchema, moneySchema, vendorOrderStatusSchema } from "./index.js";

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
  assert.ok(document.paths?.["/api/v2/notifications"]);
  assert.ok(document.paths?.["/api/v2/chat/threads"]);
  assert.ok(document.paths?.["/api/v2/admin/workspace/categories/{id}/attributes"]);
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

test("catalog contracts enforce bounded pagination and integer money", () => {
  assert.equal(catalogQuerySchema.safeParse({ limit: 51 }).success, false);
  assert.equal(catalogQuerySchema.parse({ limit: 20, query: " headphones " }).query, "headphones");
  assert.equal(createProductSchema.safeParse({ shopId: crypto.randomUUID(), categoryId: crypto.randomUUID(), name: "Test product", slug: "test-product", variants: [{ sku: "SKU-1", title: "Default", priceMinor: "12.50" }] }).success, false);
});
