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
