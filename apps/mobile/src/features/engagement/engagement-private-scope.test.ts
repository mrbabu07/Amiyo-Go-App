import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const readScreen = (name: string) => readFileSync(new URL(`./${name}`, import.meta.url), "utf8");

test("loyalty data and referral mutations stay scoped to the active account", () => {
  const source = readScreen("LoyaltyScreen.tsx");
  assert.match(source, /queryKey: \["loyalty", user\?\.uid\]/);
  assert.match(source, /queryKey: \["loyalty", "referral", user\?\.uid\]/);
  assert.match(source, /activeUid\.current !== ownerUid/);
  assert.doesNotMatch(source, /firebaseAuth/);
});

test("notification reads cannot update another account cache", () => {
  const source = readScreen("NotificationsScreen.tsx");
  assert.match(source, /queryKey: \["notifications", user\?\.uid\]/);
  assert.match(source, /activeUid\.current !== ownerUid/);
  assert.doesNotMatch(source, /firebaseAuth/);
});

test("admin promotions are cached per signed-in account", () => {
  const source = readScreen("PromotionsScreen.tsx");
  assert.match(source, /queryKey: \["admin-promotions", user\?\.uid\]/);
  assert.doesNotMatch(source, /firebaseAuth/);
});
