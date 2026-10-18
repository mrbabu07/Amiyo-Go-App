import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const orders = readFileSync(new URL("./CustomerOrdersScreen.tsx", import.meta.url), "utf8");
const tracking = readFileSync(new URL("./OrderTrackingScreen.tsx", import.meta.url), "utf8");

test("customer order cards use responsive premium marketplace actions", () => {
  assert.match(orders, /compact && styles\.actionsCompact/);
  assert.match(orders, /compact && styles\.actionCompact/);
  assert.match(orders, /boxShadow: "0 10px 30px rgba\(11,31,58,\.08\)"/);
  assert.doesNotMatch(orders, /filters: \{[^}]*borderWidth: 1/);
});

test("order tracking adapts cards and status header for mobile", () => {
  assert.match(tracking, /useWindowDimensions\(\)\.width < 620/);
  assert.match(tracking, /compact && styles\.overviewCompact/);
  assert.match(tracking, /compact && styles\.cardHeaderCompact/);
  assert.match(tracking, /backgroundColor: colors\.accentSoft/);
  assert.doesNotMatch(tracking, /card: \{[^}]*borderWidth: 1/);
});
