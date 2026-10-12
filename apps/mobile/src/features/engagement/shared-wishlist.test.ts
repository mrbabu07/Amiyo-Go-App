import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { URL } from "node:url";

const source = readFileSync(new URL("./SharedWishlistScreen.tsx", import.meta.url), "utf8");

test("shared wishlist mirrors product cards without guessing variants", () => {
  assert.match(source, /item.thumbnailUrl/);
  assert.match(source, /quickCartVariant\(detail.variants\)/);
  assert.match(source, /firebaseAuth\?\.currentUser \|\| await ensureGuestUser\(\)/);
  assert.match(source, /item.availableQuantity === 0/);
  assert.match(source, /Product image unavailable/);
  assert.match(source, /cache.setQueryData\(\["cart", result.uid\], result.cart\)/);
  assert.match(source, /accessibilityLabel=\{`Add \$\{item.name\} to cart`\}/);
});
