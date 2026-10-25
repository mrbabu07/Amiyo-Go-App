import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { marketplaceCopy, resolveMarketplaceLocale } from "./marketplace-locale";

test("customer profile locale overrides the village default", () => {
  assert.equal(resolveMarketplaceLocale("en", "bn"), "en");
  assert.equal(resolveMarketplaceLocale("bn", "en"), "bn");
  assert.equal(resolveMarketplaceLocale(null, "bn"), "bn");
  assert.equal(resolveMarketplaceLocale(null, "en"), "en");
});

test("core village shopping actions have Bangla labels", () => {
  assert.equal(marketplaceCopy.bn.home, "হোম");
  assert.equal(marketplaceCopy.bn.orders, "অর্ডার");
  assert.equal(marketplaceCopy.bn.addCart, "কার্টে যোগ করুন");
  assert.equal(marketplaceCopy.bn.callOrder, "ফোনে অর্ডার");
  const bottomNav = readFileSync(new URL("../home/components/BottomNav.tsx", import.meta.url), "utf8");
  const home = readFileSync(new URL("../home/CustomerHomeScreen.tsx", import.meta.url), "utf8");
  assert.match(bottomNav, /useMarketplaceLocale/);
  assert.match(home, /t\.villageTitle/);
  assert.match(home, /t\.callOrder/);
});
