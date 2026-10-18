import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const listSource = readFileSync(new URL("./ProductListScreen.tsx", import.meta.url), "utf8");
const shopSource = readFileSync(new URL("./ShopScreen.tsx", import.meta.url), "utf8");
const filtersSource = readFileSync(new URL("./components/ShopFilters.tsx", import.meta.url), "utf8");

test("product listing stacks toolbar and list cards on phones", () => {
  assert.match(listSource, /const compact = width < 620/);
  assert.match(listSource, /compact && responsive\.toolbarCompact/);
  assert.match(listSource, /ListProductCard compact=\{compact\}/);
  assert.match(listSource, /compact && responsive\.listImageCompact/);
});

test("shop hero and controls remain usable on phones", () => {
  assert.match(shopSource, /compact && responsive\.heroCompact/);
  assert.match(shopSource, /compact && responsive\.messageButtonCompact/);
  assert.match(shopSource, /compact && responsive\.productsHeaderCompact/);
});

test("shop filters use brand tokens instead of legacy orange", () => {
  assert.doesNotMatch(filtersSource, /#fdba8c|#c2410c|#aab4c0/i);
  assert.match(filtersSource, /borderColor: colors\.accent/);
  assert.match(filtersSource, /boxShadow: "0 10px 30px rgba\(11,31,58,\.08\)"/);
  assert.doesNotMatch(filtersSource, /card: \{[^}]*borderWidth: 1/);
  assert.doesNotMatch(shopSource, /#94a3b8|#f1f5f9|#c2410c|#7dd3fc|#cbd5e1/);
  assert.match(shopSource, /mobileFilterButton: \{[^}]*boxShadow:/);
});
