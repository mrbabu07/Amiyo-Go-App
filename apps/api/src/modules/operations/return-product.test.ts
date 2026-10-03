import assert from "node:assert/strict";
import test from "node:test";
import { returnProductDetails, returnProductSelect } from "./return-product.js";

test("return product reads purchase snapshots and only one product image", () => {
  assert.equal(returnProductSelect.product.select.media.take, 1);
  const item = { productNameSnapshot: "Original title", skuSnapshot: "Original SKU", attributesSnapshot: { color: "Olive" }, product: { media: [{ storageKey: "https://example.test/item.jpg" }] } };
  assert.deepEqual(returnProductDetails(item), { productName: "Original title", sku: "Original SKU", attributes: { color: "Olive" }, thumbnailUrl: "https://example.test/item.jpg" });
  assert.equal(returnProductDetails({ ...item, product: { media: [] } }).thumbnailUrl, null);
});

test("relative product images require configured public storage, not private evidence URLs", () => {
  const previous = process.env.OBJECT_STORAGE_PUBLIC_URL;
  const item = { productNameSnapshot: "Original", skuSnapshot: "SKU", attributesSnapshot: null, product: { media: [{ storageKey: "/catalog/item.jpg" }] } };
  try {
    delete process.env.OBJECT_STORAGE_PUBLIC_URL;
    assert.equal(returnProductDetails(item).thumbnailUrl, null);
    process.env.OBJECT_STORAGE_PUBLIC_URL = "https://cdn.example.test/";
    assert.equal(returnProductDetails(item).thumbnailUrl, "https://cdn.example.test/catalog/item.jpg");
  } finally {
    if (previous === undefined) delete process.env.OBJECT_STORAGE_PUBLIC_URL;
    else process.env.OBJECT_STORAGE_PUBLIC_URL = previous;
  }
});
