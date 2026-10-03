import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { URL } from "node:url";

test("customer and seller return lists and detail reuse product rows", () => {
  for (const file of ["operations/ReturnsScreen.tsx", "operations/ReturnDetailScreen.tsx", "vendor/VendorReturnsScreen.tsx"]) {
    const source = readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
    assert.match(source, /<ReturnProductRows items=\{item.items\}/);
  }
  const rows = readFileSync(new URL("../operations/ReturnProductRows.tsx", import.meta.url), "utf8");
  assert.match(rows, /<OrderItemImage name=\{name\} uri=\{item.thumbnailUrl\}/);
  assert.match(rows, /item.productName/);
  assert.match(rows, /item.sku/);
  assert.match(rows, /item.attributes/);
  assert.doesNotMatch(rows, /Pressable/);
});

test("seller return lists are account scoped and hide cached results on sign-out", () => {
  const source = readFileSync(new URL("../vendor/VendorReturnsScreen.tsx", import.meta.url), "utf8");
  assert.match(source, /useCurrentUser\(\)/);
  assert.match(source, /queryKey: \["vendor", "returns", user\?\.uid\]/);
  assert.match(source, /if \(!user\) return/);
  assert.match(source, /!query.error && !query.data\?\.length/);
});
