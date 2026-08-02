import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("critical discovery controls expose accessibility semantics", async () => {
  const files = await Promise.all([
    readFile(new URL("../apps/mobile/src/features/catalog/ProductDetailScreen.tsx", import.meta.url), "utf8"),
    readFile(new URL("../apps/mobile/src/features/catalog/ProductListScreen.tsx", import.meta.url), "utf8"),
    readFile(new URL("../apps/mobile/src/features/home/components/ProductCard.tsx", import.meta.url), "utf8")
  ]);
  const source = files.join("\n");
  assert.match(source, /accessibilityRole="header"/);
  assert.match(source, /accessibilityRole="button"/);
  assert.match(source, /accessibilityLabel=/);
});

test("customer home mirrors the live marketplace discovery hierarchy", async () => {
  const home = await readFile(new URL("../apps/mobile/src/features/home/CustomerHomeScreen.tsx", import.meta.url), "utf8");
  const countdown = await readFile(new URL("../apps/mobile/src/features/home/components/FlashSaleCountdown.tsx", import.meta.url), "utf8");
  const shops = await readFile(new URL("../apps/mobile/src/features/home/components/ShopRail.tsx", import.meta.url), "utf8");
  const source = `${home}\n${countdown}\n${shops}`;

  assert.match(source, /Shop by category/);
  assert.match(source, /Trending now/);
  assert.match(source, /Shop trusted sellers/);
  assert.match(source, /Recommended for you/);
  assert.match(source, /setInterval/);
  assert.match(source, /getShops/);
});
