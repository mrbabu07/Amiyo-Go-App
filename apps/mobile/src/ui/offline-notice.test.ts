import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { marketplaceCopy } from "../features/platform/marketplace-locale.js";

const source = readFileSync(new URL("./OfflineNotice.tsx", import.meta.url), "utf8");

test("offline notice follows marketplace locale and brand tokens", () => {
  assert.match(source, /useMarketplaceLocale/);
  assert.match(source, /\{t\.offline\}/);
  assert.match(source, /backgroundColor: colors\.navy/);
  assert.doesNotMatch(source, /#7c2d12|#fff/);
  assert.match(marketplaceCopy.bn.offline, /ইন্টারনেট সংযোগ নেই/);
});
