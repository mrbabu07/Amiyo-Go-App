import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./AdminCustomersScreen.tsx", import.meta.url), "utf8");

test("customer 360 uses responsive premium override surfaces", () => {
  assert.match(source, /width < 620 && premiumStyles\.cardCompact/);
  assert.match(source, /compact && premiumStyles\.detailHeadCompact/);
  assert.match(source, /metric: \{ borderWidth: 0, borderRadius: radius\.xl, boxShadow:/);
  assert.match(source, /detail: \{ borderWidth: 0, borderRadius: radius\.xl, boxShadow:/);
  assert.match(source, /statusBad: \{ backgroundColor: colors\.primarySoft, color: colors\.danger \}/);
});
