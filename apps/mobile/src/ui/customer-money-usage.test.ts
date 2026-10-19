import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const mobile = resolve(import.meta.dirname, "../..");
const screens = [
  "src/features/commerce/CartScreen.tsx",
  "src/features/commerce/components/CouponInput.tsx",
  "src/features/commerce/GuestCheckoutScreen.tsx",
  "src/features/commerce/OrderConfirmationScreen.tsx",
  "src/features/catalog/ComparisonScreen.tsx",
  "src/features/engagement/SharedWishlistScreen.tsx",
  "src/features/engagement/WishlistScreen.tsx",
  "src/features/operations/ReturnsScreen.tsx",
  "src/features/operations/ReturnDetailScreen.tsx",
  "src/features/orders/CustomerOrderDetailScreen.tsx",
  "src/features/orders/CustomerOrdersScreen.tsx"
];

test("customer commerce and after-sales screens format minor units without floats", () => {
  for (const file of screens) {
    const source = readFileSync(resolve(mobile, file), "utf8");
    assert.match(source, /formatMinor/);
    assert.doesNotMatch(source, /Number\(minor/);
  }
});
