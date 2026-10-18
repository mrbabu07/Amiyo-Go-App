import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const readScreen = (name: string) => readFileSync(new URL(`./${name}`, import.meta.url), "utf8");

test("loyalty data and referral mutations stay scoped to the active account", () => {
  const source = readScreen("LoyaltyScreen.tsx");
  assert.match(source, /queryKey: \["loyalty", user\?\.uid\]/);
  assert.match(source, /queryKey: \["loyalty", "referral", user\?\.uid\]/);
  assert.match(source, /activeUid\.current !== ownerUid/);
  assert.match(source, /useWindowDimensions\(\)\.width < 620/);
  assert.match(source, /compact && styles\.heroStatsCompact/);
  assert.match(source, /compact && styles\.stack/);
  assert.match(source, /compact && styles\.fullWidth/);
  assert.match(source, /accessibilityLabel="Referral code"/);
  assert.match(source, /accessibilityState=\{\{ busy: apply\.isPending, disabled: !referralReady \}\}/);
  assert.match(source, /compact && styles\.entryCompact/);
  assert.match(source, /Redeemed/);
  assert.doesNotMatch(source, /#fff|#cbd5e1|#334155|#94a3b8/);
  assert.doesNotMatch(source, /Ã‚Â·|Ã¢â‚¬Â¦/);
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
  assert.match(source, /useWindowDimensions\(\)\.width < 620/);
  assert.match(source, /compact && styles\.summaryCardCompact/);
  assert.match(source, /compact && styles\.cardCompact/);
  assert.match(source, /compact && styles\.priorityCompact/);
  assert.doesNotMatch(source, /Ã¢â€ â€™|#ecfdf5/);
  assert.doesNotMatch(source, /firebaseAuth/);
});
