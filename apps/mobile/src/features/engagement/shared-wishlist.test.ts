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

test("shared wishlist heart is independent and account scoped", () => {
  assert.match(source, /useCurrentUser\(\)/);
  assert.match(source, /queryKey: \["wishlist", user\?\.uid \?\? null\]/);
  assert.match(source, /router\.push\("\/auth" as never\)/);
  assert.match(source, /firebaseAuth\?\.currentUser\?\.uid !== uid/);
  assert.match(source, /cache\.setQueryData\(\["wishlist", uid\], data\)/);
  assert.match(source, /accessibilityState=\{\{ busy: toggleWishlist\.isPending, selected: saved \}\}/);
  assert.match(source, /<\/Pressable>\s*<Pressable accessibilityLabel=\{`\$\{saved \? "Remove" : "Save"\}/);
});
