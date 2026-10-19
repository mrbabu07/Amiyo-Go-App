import assert from "node:assert/strict";
import test from "node:test";
import { productDiscount, quickCartVariant } from "./product-card-policy";

test("discount badges require a genuine exact price reduction", () => {
  assert.equal(productDiscount("8000", "10000"), 20);
  for (const original of [undefined, "0", "8000", "7000", "Infinity", "NaN"]) assert.equal(productDiscount("8000", original), 0);
  assert.equal(productDiscount("-1", "10000"), 0);
  assert.equal(productDiscount("NaN", "10000"), 0);
});

test("quick cart selects only a single active purchasable variant", () => {
  assert.equal(quickCartVariant([{ id: "inactive", active: false, availableQuantity: 5 }, { id: "active", active: true, availableQuantity: 2 }]), "active");
});

test("multiple active choices require selection rather than silently choosing", () => {
  assert.equal(quickCartVariant([{ id: "small", active: true, availableQuantity: 0 }, { id: "large", active: true, availableQuantity: 2 }]), null);
});

test("empty, inactive and fully sold-out products cannot be added", () => {
  for (const variants of [[], [{ id: "disabled", active: false, availableQuantity: 9 }], [{ id: "empty", active: true, availableQuantity: 0 }]]) {
    assert.throws(() => quickCartVariant(variants), /out of stock/);
  }
});
