import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const screenUrl = new URL("../apps/mobile/src/features/catalog/ShopScreen.tsx", import.meta.url);
const filtersUrl = new URL("../apps/mobile/src/features/catalog/components/ShopFilters.tsx", import.meta.url);
const apiUrl = new URL("../apps/mobile/src/features/catalog/catalog.api.ts", import.meta.url);

test("shop page mirrors reference category and sort filters", async () => {
  const [screen, filters] = await Promise.all([readFile(screenUrl, "utf8"), readFile(filtersUrl, "utf8")]);
  for (const capability of ["selectedCategory", "sortProducts", "categoryOptions", "Showing {filteredProducts.length} of {products.length} products", "No Products Found"]) assert.match(screen, new RegExp(capability.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  for (const label of ["Filters", "Categories", "All Products", "Newest First", "Most Popular", "Price: Low to High", "Price: High to Low", "Highest Rated", "Reset"]) assert.match(filters, new RegExp(label));
});

test("shop filters adapt between desktop sidebar and mobile panel", async () => {
  const source = await readFile(screenUrl, "utf8");
  for (const capability of ["desktop ? <View style={styles.sidebar}", "Filters & Sort", "showMobileFilters", "mobileFilterButton"]) assert.match(source, new RegExp(capability.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
});

test("shop request loads the complete supported filter set", async () => {
  const source = await readFile(apiUrl, "utf8");
  assert.match(source, /shops\/\$\{encodeURIComponent\(identifier\)\}\?limit=50/);
});
