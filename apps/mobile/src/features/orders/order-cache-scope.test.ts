import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const customer = readFileSync(new URL("./CustomerOrderDetailScreen.tsx", import.meta.url), "utf8");
const inlineCancel = readFileSync(new URL("./InlineOrderCancellation.tsx", import.meta.url), "utf8");
const vendor = readFileSync(new URL("./VendorOrderDetailScreen.tsx", import.meta.url), "utf8");

test("customer order mutations invalidate only the active customer", () => {
  assert.match(customer, /\["orders", "customer", user\.uid\]/);
  assert.match(customer, /\["returns", "customer", user\.uid\]/);
  assert.doesNotMatch(customer, /queryKey: \["orders"\]/);
  assert.match(inlineCancel, /\["orders", "customer", user\.uid\]/);
  assert.doesNotMatch(inlineCancel, /queryKey: \["orders"\]/);
});

test("seller order completion cannot update another account cache", () => {
  assert.match(vendor, /activeUid\.current !== user\.uid/);
  assert.match(vendor, /\["orders", "vendor", user\.uid\]/);
  assert.doesNotMatch(vendor, /queryKey: \["orders", "vendor"\]/);
});
