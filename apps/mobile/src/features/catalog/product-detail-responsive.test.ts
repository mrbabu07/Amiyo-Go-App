import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./ProductDetailScreen.tsx", import.meta.url), "utf8");

test("product detail uses compact mobile purchase hierarchy", () => {
  assert.match(source, /const compact = width < 620/);
  assert.match(source, /compact && responsive\.titleCompact/);
  assert.match(source, /compact && responsive\.priceCompact/);
  assert.match(source, /compact && responsive\.quantitySectionCompact/);
});

test("seller, specifications and engagement panels stack on phones", () => {
  assert.match(source, /SellerInfoStrip compact=\{compact\}/);
  assert.match(source, /compact && responsive\.sellerIdentityCompact/);
  assert.match(source, /compact && responsive\.specRowCompact/);
  assert.match(source, /compact && responsive\.panelCompact/);
});
