import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

test("home and shop open scoped vendor offer popups", () => {
  const home = read("./CustomerHomeScreen.tsx");
  const shop = read("../catalog/ShopScreen.tsx");
  assert.match(home, /<OfferPopup offers={growthQuery\.data\?\.storeOffers \|\| \[\]} scope="home"/);
  assert.match(shop, /<OfferPopup offers={result\.data\?\.offers \|\| \[\]} scope={`shop:\$\{identifier\}`} \/>/);
});

test("two side offer boxes rotate vendor banners without nesting buttons", () => {
  const carousel = read("./components/PromoTiles.tsx");
  const popup = read("./components/OfferPopup.tsx");
  assert.match(carousel, /setInterval/);
  assert.match(carousel, /\[0, 1\]\.map/);
  assert.match(carousel, /offer\?\.imageUrl/);
  assert.match(popup, /sessionStorage/);
  assert.doesNotMatch(popup, /<Pressable[^>]*>[\s\S]*<Pressable[^>]*>[\s\S]*<\/Pressable>[\s\S]*<\/Pressable>/);
});
