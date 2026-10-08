import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { URL } from "node:url";

test("order expansion is a disclosure with lazy mounted detail queries", () => {
  const source = readFileSync(new URL("./CustomerOrdersScreen.tsx", import.meta.url), "utf8");
  assert.match(source, /accessibilityState=\{\{ expanded \}\}/);
  assert.match(source, /onPress=\{\(\) => setExpanded\(\(value\) => !value\)\}/);
  assert.match(source, /expanded \? <CustomerOrderExpansion/);
  assert.match(source, /View details/);
  assert.match(source, /Invoice/);
});

test("expanded order data remains account scoped and uses real package event timestamps", () => {
  const source = readFileSync(new URL("./CustomerOrderExpansion.tsx", import.meta.url), "utf8");
  assert.match(source, /queryKey: \["orders", "customer", id, user\?\.uid\]/);
  assert.match(source, /queryKey: \["orders", id, "tracking", user\?\.uid\]/);
  assert.match(source, /if \(!user\) return null/);
  assert.equal((source.match(/retry: false/g) ?? []).length, 2);
  assert.match(source, /onRetry=\{\(\) => void order.refetch\(\)\}/);
  assert.match(source, /onRetry=\{\(\) => void tracking.refetch\(\)\}/);
  assert.match(source, /entry.vendorOrderId === pack.id/);
  assert.match(source, /shipment.events.map/);
  assert.match(source, /event.occurredAt/);
  for (const text of ["Delivery address", "Payment", "Order summary", "Package total", "Discount", "No courier events recorded yet", "Try again"]) assert.ok(source.includes(text));
  assert.match(source, /compact && styles.fullWidth/);
  assert.doesNotMatch(source, /#[0-9a-f]{3,8}/i);
});
