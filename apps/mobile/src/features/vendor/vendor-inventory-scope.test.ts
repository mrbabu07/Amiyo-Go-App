import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { URL } from "node:url";

const source = readFileSync(new URL("./VendorInventoryScreen.tsx", import.meta.url), "utf8");

test("vendor inventory reads and writes stay account scoped", () => {
  assert.match(source, /useCurrentUser/);
  assert.match(source, /\["vendor", "inventory", user\?\.uid\]/);
  assert.match(source, /variables\.owner\.uid/);
  assert.doesNotMatch(source, /firebaseAuth/);
  assert.match(source, /retry: false/);
});

test("vendor inventory rejects malformed stock before mutation", () => {
  assert.match(source, /Number\.isSafeInteger/);
  assert.match(source, /parsed >= 0/);
  assert.match(source, /onHand === null/);
  assert.match(source, /Enter a whole stock quantity/);
});
