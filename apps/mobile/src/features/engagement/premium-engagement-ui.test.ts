import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const wishlist = readFileSync(new URL("./WishlistScreen.tsx", import.meta.url), "utf8");
const notifications = readFileSync(new URL("./NotificationsScreen.tsx", import.meta.url), "utf8");

test("wishlist uses elevated premium surfaces", () => {
  assert.match(wishlist, /panel: \{[^}]*boxShadow:/);
  assert.match(wishlist, /card: \{[^}]*boxShadow: "0 10px 30px rgba\(11,31,58,\.08\)"/);
  assert.match(wishlist, /primaryText: \{ color: colors\.surface/);
});

test("notifications adapt to mobile with current brand colors", () => {
  assert.match(notifications, /useWindowDimensions\(\)\.width < 620/);
  assert.match(notifications, /compact && styles\.summaryCompact/);
  assert.match(notifications, /compact && styles\.cardCompact/);
  assert.match(notifications, /cardUnread: \{ backgroundColor: colors\.primarySoft \}/);
  assert.doesNotMatch(notifications, /#f8fdff|#bae6fd|#334155|#94a3b8/);
});
