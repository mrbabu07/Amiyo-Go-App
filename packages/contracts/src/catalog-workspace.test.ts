import assert from "node:assert/strict";
import test from "node:test";
import { archiveProductSchema, replaceProductMediaSchema, replaceProductVariantsSchema } from "./catalog.js";

const productVersion = 1;
const variantId = "11111111-1111-4111-8111-111111111111";
const uploadId = "22222222-2222-4222-8222-222222222222";

test("variant replacement requires unique SKUs and valid stock", () => {
  const variant = { sku: "SKU-BLACK-M", title: "Black / M", attributes: { color: "Black", size: "M" }, priceMinor: "129900", currency: "BDT", onHand: 8, active: true };
  assert.equal(replaceProductVariantsSchema.safeParse({ version: productVersion, variants: [variant] }).success, true);
  assert.equal(replaceProductVariantsSchema.safeParse({ version: productVersion, variants: [variant, { ...variant, id: variantId }] }).success, false);
  assert.equal(replaceProductVariantsSchema.safeParse({ version: productVersion, variants: [{ ...variant, onHand: -1 }] }).success, false);
});

test("media replacement accepts existing or completed upload references only", () => {
  assert.equal(replaceProductMediaSchema.safeParse({ version: productVersion, items: [{ uploadId, altText: "Front view", displayOrder: 0 }] }).success, true);
  assert.equal(replaceProductMediaSchema.safeParse({ version: productVersion, items: [{ id: variantId, uploadId, displayOrder: 0 }] }).success, false);
  assert.equal(replaceProductMediaSchema.safeParse({ version: productVersion, items: [{ uploadId, displayOrder: 0 }, { uploadId, displayOrder: 1 }] }).success, false);
});

test("product archive requires optimistic version and durable reason", () => {
  assert.equal(archiveProductSchema.safeParse({ version: 2, reason: "Seller discontinued this item" }).success, true);
  assert.equal(archiveProductSchema.safeParse({ version: 0, reason: "No" }).success, false);
});
