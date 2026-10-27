import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("seller expansion lazily reads scoped package details and recorded timeline", () => {
  const list = readFileSync(new URL("./VendorOrdersScreen.tsx", import.meta.url), "utf8");
  const detail = readFileSync(new URL("./VendorOrderExpansion.tsx", import.meta.url), "utf8");
  assert.match(list, /expandedId === order.id \? <VendorOrderExpansion/);
  assert.match(list, /accessibilityState=\{\{ expanded: expandedId === order.id \}\}/);
  assert.match(list, /setExpandedId\(null\); \}, \[user\?\.uid\]/);
  assert.match(detail, /queryKey: \["orders", "vendor", id, user\?\.uid\]/);
  assert.match(detail, /order.shipment\?\.events.map/);
  assert.match(detail, /formatMinor\(item.lineTotal.amountMinor/);
  assert.match(detail, /if \(!user\) return null/);
});
