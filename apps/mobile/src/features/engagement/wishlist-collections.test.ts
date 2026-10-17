import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { URL } from "node:url";

test("catalog heart mutations invalidate the collection counts for their initiating account", () => {
  for (const path of ["../home/components/ProductCard.tsx", "../catalog/ProductDetailScreen.tsx"]) {
    const source = readFileSync(new URL(path, import.meta.url), "utf8");
    assert.match(source, /activeUid\.current !== uid/);
    assert.match(source, /invalidateQueries\(\{ queryKey: \["wishlist-collections", uid\] \}\)/);
  }
});

test("collection selection, cache writes and picker state are account scoped", () => {
  const screen = readFileSync(new URL("./WishlistScreen.tsx", import.meta.url), "utf8");
  assert.match(screen, /selection\?\.uid === user\?\.uid/);
  assert.match(screen, /onMutate: \(\) => \(\{ uid: user\?\.uid, key: wishlistKey \}\)/);
  assert.match(screen, /cache.setQueryData\(context.key, data\)/);
  assert.match(screen, /getWishlist\(user!, collectionId\)/);
  for (const operation of ["shareWishlist", "unshareWishlist"]) assert.ok(screen.includes(operation + "(user!, collectionId)"));
  const panel = readFileSync(new URL("./WishlistCollections.tsx", import.meta.url), "utf8");
  assert.match(panel, /activeUid\.current !== result.uid/);
  assert.match(panel, /Confirm delete collection/);
  assert.match(panel, /selected && !selected.isDefault/);
  assert.match(panel, /addWishlistItem\(user, productId, id\)/);
  assert.doesNotMatch(panel, /firebaseAuth/);
  assert.doesNotMatch(panel, /#[0-9a-f]{3,8}/i);
});
