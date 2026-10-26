import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./CartScreen.tsx", import.meta.url), "utf8");

test("cart keeps checkout controls readable on narrow screens", () => {
  assert.match(source, /useWindowDimensions\(\)\.width < 620/);
  assert.match(source, /\["cart", user\?\.uid \?\? null\]/);
  assert.match(source, /compact && styles\.columnsCompact/);
  assert.match(source, /compact && styles\.itemCompact/);
  assert.match(source, /compact && styles\.summaryCompact/);
  assert.match(source, /fallbackProductImage/);
  assert.match(source, /shopGroups\.map/);
  assert.match(source, /delivered as one seller package/);
  assert.match(source, /Select all products/);
  assert.match(source, /accessibilityRole="checkbox"/);
  assert.match(source, /Unselected products stay safely in your cart/);
  assert.match(source, /shopGroup: \{ backgroundColor: colors\.surface/);
  assert.match(source, /premiumStyles\.summary/);
  assert.match(source, /quantityButton: \{ height: 44, width: 44 \}/);
  assert.match(source, /lineTotalCompact: \{ alignSelf: "flex-end", paddingLeft: 0/);
  assert.doesNotMatch(source, /placehold\.co/);
  assert.doesNotMatch(source, /à§³|Â·|â€¦/);
});
