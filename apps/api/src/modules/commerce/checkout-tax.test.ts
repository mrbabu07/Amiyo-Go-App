import assert from "node:assert/strict";
import test from "node:test";
import { checkoutTax } from "./commerce.service.js";

test("disabled or malformed tax policy adds no checkout tax", () => {
  assert.deepEqual(checkoutTax(10_000n, { enabled: false, rateBps: 1_500, pricesIncludeTax: false }), { taxMinor: 0n, addedMinor: 0n });
  assert.deepEqual(checkoutTax(10_000n, { enabled: true, rateBps: 10_001, pricesIncludeTax: false }), { taxMinor: 0n, addedMinor: 0n });
});

test("exclusive admin tax uses exact integer basis points and increases payable", () => {
  assert.deepEqual(checkoutTax(10_001n, { enabled: true, rateBps: 1_500, pricesIncludeTax: false }), { taxMinor: 1_500n, addedMinor: 1_500n });
});

test("tax-inclusive prices expose their embedded tax without increasing payable", () => {
  assert.deepEqual(checkoutTax(11_500n, { enabled: true, rateBps: 1_500, pricesIncludeTax: true }), { taxMinor: 1_500n, addedMinor: 0n });
});
