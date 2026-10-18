import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./AdminCommissionScreen.tsx", import.meta.url), "utf8");

test("admin commission controls remain usable on mobile", () => {
  assert.match(source, /useWindowDimensions\(\)\.width < 620/);
  assert.match(source, /compact && styles\.ruleCompact/);
  assert.match(source, /compact && styles\.metricCompact/);
  assert.match(source, /compact && styles\.fieldCompact/);
  assert.match(source, /compact && styles\.modalCompact/);
  assert.match(source, /compact && styles\.actionCompact/);
  assert.match(source, /adjustsFontSizeToFit numberOfLines=\{1\}/);
});
