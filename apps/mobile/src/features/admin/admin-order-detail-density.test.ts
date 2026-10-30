import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("admin order customer, payment and totals cards use compact information rows", () => {
  const source = readFileSync(new URL("./AdminOrderDetailScreen.tsx", import.meta.url), "utf8");

  assert.match(source, /info: \{ gap: 2, minWidth: 0 \}/);
  assert.match(source, /infoGrid: \{ flexBasis: 120, flexGrow: 1 \}/);
  assert.doesNotMatch(source, /info: \{ flexBasis: 140/);
  assert.match(source, /<Info grid label="Seller total"/);
});
