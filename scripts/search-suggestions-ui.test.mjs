import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("store search provides bounded debounced marketplace suggestions", async () => {
  const [header, catalog] = await Promise.all([read("apps/mobile/src/features/home/components/StoreHeader.tsx"), read("apps/mobile/src/features/catalog/catalog.api.ts")]);
  assert.match(header, /setTimeout\(\(\) => setDebouncedQuery\(query\.trim\(\)\), 250\)/);
  assert.match(header, /searchProducts\(debouncedQuery, 8\)/);
  assert.match(header, /type: "category"/);
  assert.match(header, /type: "product"/);
  assert.match(header, /type: "shop"/);
  assert.match(header, /accessibilityLabel="Search suggestions"/);
  assert.match(header, /ArrowDown/);
  assert.match(catalog, /searchProducts\(query: string, limit = 30\)/);
});

test("marketplace product cards use shadow without an outline", async () => {
  const card = await read("apps/mobile/src/features/home/components/ProductCard.tsx");
  const style = card.match(/card: \{([^}]+)\}/)?.[1] || "";
  assert.doesNotMatch(style, /borderWidth|borderColor/);
  assert.match(card, /cardShadow/);
});
