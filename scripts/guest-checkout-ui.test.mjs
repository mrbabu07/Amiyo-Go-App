import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("guest checkout uses a verified anonymous identity and dedicated route", async () => {
  const [auth, route, screen] = await Promise.all([read("apps/mobile/src/features/auth/guest-auth.ts"), read("apps/mobile/app/checkout/guest.tsx"), read("apps/mobile/src/features/commerce/GuestCheckoutScreen.tsx")]);
  assert.match(auth, /signInAnonymously/);
  assert.match(auth, /createSession\(user\)/);
  assert.match(route, /GuestCheckoutScreen/);
  assert.match(screen, /createMyAddress/);
  assert.match(screen, /placeOrder/);
  assert.match(screen, /CouponInput/);
  assert.match(screen, /Cash on delivery/);
});

test("guest shopping starts before login and preserves authenticated checkout", async () => {
  const [product, cart] = await Promise.all([read("apps/mobile/src/features/catalog/ProductDetailScreen.tsx"), read("apps/mobile/src/features/commerce/CartScreen.tsx")]);
  assert.match(product, /ensureGuestUser/);
  assert.match(cart, /Continue as guest/);
  assert.match(cart, /user\.isAnonymous \? "\/checkout\/guest" : "\/checkout"/);
});
