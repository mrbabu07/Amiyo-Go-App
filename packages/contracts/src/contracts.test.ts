import assert from "node:assert/strict";
import test from "node:test";
import { addressInputSchema, createOpenApiDocument, deviceInputSchema, minorUnitSchema, moneySchema, vendorOrderStatusSchema } from "./index.js";

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
});

test("identity mutation contracts reject incomplete data", () => {
  assert.equal(addressInputSchema.safeParse({ label: "Home" }).success, false);
  assert.equal(deviceInputSchema.safeParse({ installationId: "install-123", platform: "web", pushToken: "token-value" }).success, false);
});
