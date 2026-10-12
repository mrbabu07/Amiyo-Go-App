import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { URL } from "node:url";
import { quickCartVariant } from "../catalog/product-card-policy";

const source = readFileSync(new URL("./WishlistScreen.tsx", import.meta.url), "utf8");

test("wishlist quick cart requires a current sellable variant, never guesses options", () => {
  assert.equal(quickCartVariant([{ id: "single", active: true, availableQuantity: 1 }]), "single");
  assert.equal(quickCartVariant([{ id: "red", active: true, availableQuantity: 1 }, { id: "blue", active: true, availableQuantity: 0 }]), null);
  assert.throws(() => quickCartVariant([{ id: "sold-out", active: true, availableQuantity: 0 }]), /out of stock/);
  assert.match(source, /await getProduct\(item.slug \|\| item.productId\)/);
  assert.match(source, /quickCartVariant\(detail.variants\)/);
  assert.match(source, /if \(!variantId\) \{ onOpen\(\); return null; \}/);
  assert.match(source, /await addCartItem\(user, variantId, 1\)/);
});

test("wishlist cart cache and card state stay scoped to the signed-in account", () => {
  assert.match(source, /firebaseAuth\?\.currentUser\?\.uid !== user.uid/);
  assert.match(source, /firebaseAuth\?\.currentUser\?\.uid === result.uid/);
  assert.match(source, /cache.setQueryData\(\["cart", result.uid\], result.cart\)/);
  assert.ok(source.includes('key={`${user.uid}:${item.productId}`}'));
  assert.match(source, /addToCart.isPending \|\| !item.price \|\| item.availableQuantity === 0/);
});

test("wishlist layout preserves theme, responsive stacking and independent controls", () => {
  assert.match(source, /width < 1024/);
  assert.match(source, /compact && styles.fullWidth/);
  assert.match(source, /<\/Pressable>\s*<View style=\{styles.cardActions\}>/);
  assert.match(source, /minHeight: 44, minWidth: 44/);
  assert.match(source, /Product image unavailable/);
  assert.match(source, /catch \{\s*setShareError/);
  assert.doesNotMatch(source, /placehold.co|#334155|#064e3b|minWidth: 250/);
  assert.match(source, /flexBasis: 260, flexGrow: 1, flexShrink: 1, minWidth: 0, maxWidth: 360/);
  assert.match(source, /Only \$\{item\.availableQuantity\} left/);
  assert.match(source, /item\.availableQuantity === 0 \? "Out of stock"/);
});
