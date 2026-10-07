import assert from "node:assert/strict";
import test from "node:test";
import { productAlertSelectionSchema, stockAlertInputSchema } from "./engagement.js";

const productId = "91000000-0000-4000-8000-000000000001";
test("alert removal accepts only supported kinds or the legacy all-kind selection", () => {
  assert.equal(productAlertSelectionSchema.safeParse({}).success, true);
  assert.equal(productAlertSelectionSchema.safeParse({ kind: "stock" }).success, true);
  assert.equal(productAlertSelectionSchema.safeParse({ kind: "price" }).success, true);
  assert.equal(productAlertSelectionSchema.safeParse({ kind: "flash" }).success, false);
  assert.equal(productAlertSelectionSchema.safeParse({ kind: ["stock", "price"] }).success, false);
});
test("alert targets reject invalid or PostgreSQL-overflow amounts before persistence", () => {
  for (const targetMinor of ["0", "-1", "1.5", "1e5", "", "01", "9223372036854775808", "9".repeat(100)]) {
    assert.equal(stockAlertInputSchema.safeParse({ productId, targetMinor }).success, false, targetMinor);
  }
  for (const targetMinor of [null, undefined, "1", "50000", "9223372036854775807"]) {
    assert.equal(stockAlertInputSchema.safeParse({ productId, targetMinor }).success, true);
  }
});
