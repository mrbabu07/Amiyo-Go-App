import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

test("customer navigation exposes live cart, wishlist and order update counts", () => {
  const bottomNav = read("../home/components/BottomNav.tsx");
  const header = read("../home/components/StoreHeader.tsx");

  assert.match(bottomNav, /count: cart\.data\?\.itemCount/);
  assert.match(bottomNav, /count: wishlist\.data\?\.items\.length/);
  assert.match(bottomNav, /item\.href\?\.startsWith\("\/orders"\)/);
  assert.match(header, /Notifications, \$\{unreadNotifications\} unread/);
});

test("admin navigation replaces the permanent dot with live numeric counts", () => {
  const screen = read("../../ui/Screen.tsx");

  assert.match(screen, /function CountBadge/);
  assert.match(screen, /Notifications, \$\{unreadNotifications\} unread/);
  assert.match(screen, /Orders, \$\{unreadOrders\} new updates/);
  assert.doesNotMatch(screen, /<View style=\{styles\.notificationDot\}/);
});

test("product add-to-cart actions show a dismissing success toast", () => {
  const detail = read("../catalog/ProductDetailScreen.tsx");
  const card = read("../home/components/ProductCard.tsx");
  const toast = read("./components/CartAddedToast.tsx");

  assert.match(detail, /else setCartAdded\(true\)/);
  assert.match(detail, /<CartAddedToast/);
  assert.match(card, /setShowCartToast\(true\)/);
  assert.match(card, /<CartAddedToast/);
  assert.match(toast, />Added to cart</);
  assert.match(toast, /2_400/);
});
