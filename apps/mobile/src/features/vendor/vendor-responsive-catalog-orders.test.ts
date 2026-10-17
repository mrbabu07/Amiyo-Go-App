import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const root = resolve(import.meta.dirname, "../../..");
const products = readFileSync(resolve(root, "src/features/vendor/VendorProductsScreen.tsx"), "utf8");
const orders = readFileSync(resolve(root, "src/features/orders/VendorOrdersScreen.tsx"), "utf8");
const finance = readFileSync(resolve(root, "src/features/operations/VendorFinanceScreen.tsx"), "utf8");
const shop = readFileSync(resolve(root, "src/features/vendor/VendorShopScreen.tsx"), "utf8");

test("seller catalog becomes a full-width mobile workspace", () => {
  assert.match(products, /useWindowDimensions\(\)\.width < 620/);
  assert.match(products, /compact && styles\.searchCompact/);
  assert.match(products, /compact && styles\.toolbarButtonCompact/);
  assert.match(products, /compact && styles\.cardCompact/);
  assert.match(products, /cardCompact: \{ minWidth: 0, width: "100%" \}/);
});

test("seller orders preserve readable mobile cards and actions", () => {
  assert.match(orders, /useWindowDimensions\(\)\.width < 620/);
  assert.match(orders, /compact && styles\.cardHeaderCompact/);
  assert.match(orders, /compact && styles\.orderBodyCompact/);
  assert.match(orders, /compact && styles\.actionsCompact/);
  assert.match(orders, /compact && styles\.actionCompact/);
});

test("seller finance protects the balance hero on narrow screens", () => {
  assert.match(finance, /useWindowDimensions\(\)\.width < 620/);
  assert.match(finance, /compact && styles\.heroCompact/);
  assert.match(finance, /adjustsFontSizeToFit numberOfLines=\{1\}/);
});

test("storefront manager stacks preview tools on mobile", () => {
  assert.match(shop, /useWindowDimensions\(\)\.width < 620/);
  assert.match(shop, /compact && styles\.previewCompact/);
  assert.match(shop, /compact && styles\.toolCompact/);
  assert.match(shop, /toolCompact: \{ width: "100%" \}/);
  assert.match(shop, /activeUid\.current === variables\.owner\.uid/);
});
