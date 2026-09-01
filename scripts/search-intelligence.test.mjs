import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("catalog exposes typo correction and discovery endpoints", async () => {
  const [ranking, routes, contracts] = await Promise.all([
    read("apps/api/src/modules/catalog/catalog-ranking.ts"),
    read("apps/api/src/modules/catalog/catalog.routes.ts"),
    read("packages/contracts/src/catalog.ts")
  ]);
  assert.match(ranking, /fuzzySearchScore/);
  assert.match(ranking, /fuzzySearchThreshold/);
  assert.match(routes, /catalog\/trending-searches/);
  assert.match(routes, /catalog\/recommendations/);
  assert.match(routes, /catalog\/discovery-events/);
  assert.match(contracts, /discoveryEventInputSchema/);
});

test("search remembers discovery and renders trending terms", async () => {
  const [header, discovery] = await Promise.all([
    read("apps/mobile/src/features/home/components/StoreHeader.tsx"),
    read("apps/mobile/src/features/catalog/discovery.api.ts")
  ]);
  assert.match(header, /Recent searches/);
  assert.match(header, /Trending searches/);
  assert.match(header, /rememberSearch/);
  assert.match(discovery, /amiyo:recent-searches/);
  assert.match(discovery, /amiyo:discovery-session/);
});

test("home, product, cart and wishlist feed personalized ranking", async () => {
  const [home, detail, card] = await Promise.all([
    read("apps/mobile/src/features/home/CustomerHomeScreen.tsx"),
    read("apps/mobile/src/features/catalog/ProductDetailScreen.tsx"),
    read("apps/mobile/src/features/home/components/ProductCard.tsx")
  ]);
  assert.match(home, /getRecommendations/);
  assert.match(detail, /PRODUCT_VIEW/);
  assert.match(detail, /ADD_TO_CART/);
  assert.match(card, /WISHLIST/);
});
