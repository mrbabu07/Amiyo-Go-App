import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const detail = readFileSync(new URL("./AdminOrderDetailScreen.tsx", import.meta.url), "utf8");
const refund = readFileSync(new URL("./AdminOrderRefund.tsx", import.meta.url), "utf8");
const orders = readFileSync(new URL("./AdminOrdersScreen.tsx", import.meta.url), "utf8");

test("admin order detail and refunds keep monetary values exact", () => {
  assert.match(detail, /formatMinor\(minor\)/);
  assert.doesNotMatch(detail, /Number\(minor\)/);
  assert.match(refund, /minorToMajorInput\(remaining\)/);
  assert.match(refund, /parseMajorToMinor\(amount\)/);
  assert.match(refund, /formatMinor\(minor\)/);
  assert.match(refund, /\["admin", "settings", userId\]/);
  assert.match(refund, /policy\.allowPartial \|\| amountMinor === remaining/);
  assert.match(refund, /policy\.requireProviderReference \|\| providerRefundId\.trim\(\)\.length >= 2/);
  assert.match(refund, /providerRefundId\.trim\(\) \|\| null/);
  assert.doesNotMatch(refund, /Number\(remaining\)/);
  assert.doesNotMatch(refund, /Math\.round\(parsed \* 100\)/);
});

test("admin order overview aggregates revenue in minor units", () => {
  assert.match(orders, /sumMinor\(/);
  assert.match(orders, /formatMinor\(minor\)/);
  assert.doesNotMatch(orders, /sum \+ Number\(item\.totalMinor\)/);
});
