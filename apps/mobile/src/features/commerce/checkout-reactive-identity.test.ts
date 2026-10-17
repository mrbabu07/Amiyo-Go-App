import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const checkout = readFileSync(new URL("./CheckoutScreen.tsx", import.meta.url), "utf8");
const recovery = readFileSync(new URL("./CheckoutRecovery.tsx", import.meta.url), "utf8");
const guest = readFileSync(new URL("./GuestCheckoutScreen.tsx", import.meta.url), "utf8");

test("checkout completion and coupon results follow reactive identity", () => {
  assert.match(checkout, /activeUid\.current = user\?\.uid/);
  assert.match(checkout, /activeUid\.current !== ownerUid/);
  assert.match(checkout, /\[user\?\.uid\]/);
  assert.doesNotMatch(checkout, /firebaseAuth/);
});

test("guest checkout address, coupon, and order completion follow reactive identity", () => {
  assert.match(guest, /activeUid\.current = user\?\.uid/);
  assert.match(guest, /activeUid\.current !== ownerUid/);
  assert.match(guest, /deliveryAddresses\.current\.clear\(\)/);
  assert.doesNotMatch(guest, /firebaseAuth/);
});

test("checkout recovery validates the reactive current account", () => {
  assert.match(recovery, /useCurrentUser\(\)/);
  assert.match(recovery, /activeUid\.current !== user\.uid/);
  assert.doesNotMatch(recovery, /firebaseAuth/);
});
