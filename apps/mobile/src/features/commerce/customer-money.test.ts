import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const files = [
  "./CheckoutScreen.tsx",
  "../catalog/ProductDetailScreen.tsx",
  "../catalog/ProductListScreen.tsx",
  "../catalog/ShopScreen.tsx",
  "../orders/CustomerOrderExpansion.tsx",
  "../orders/FulfillmentDocumentScreen.tsx",
  "../orders/OrderDeliverySummary.tsx",
  "../home/components/DeliveryAvailability.tsx"
];

test("customer prices, totals and documents avoid floating-point minor-unit math", () => {
  for (const file of files) {
    const source = readFileSync(new URL(file, import.meta.url), "utf8");
    assert.match(source, /ui\/money/);
    assert.doesNotMatch(source, /Number\([^\r\n]*amountMinor/);
  }
  const checkout = readFileSync(new URL("./CheckoutScreen.tsx", import.meta.url), "utf8");
  assert.match(checkout, /subtractMinor\(quote\.data\.discount\.amountMinor/);
  assert.match(checkout, /BigInt\(quote\.data\.loyalty\.availablePoints\) < 100n/);
  const product = readFileSync(new URL("../catalog/ProductDetailScreen.tsx", import.meta.url), "utf8");
  assert.match(product, /percentageDiscount/);
  assert.match(product, /multiplyMinor/);
});
