import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const source = readFileSync(resolve(import.meta.dirname, "AdminLogisticsScreen.tsx"), "utf8");

test("admin logistics uses exact minor-unit helpers", () => {
  assert.match(source, /formatMinor/);
  assert.match(source, /parseMajorToMinor\(fee\)/);
  assert.match(source, /isPositiveMinor\(row\.codAmountMinor\)/);
  assert.doesNotMatch(source, /Number\(row\.codAmountMinor\)/);
  assert.doesNotMatch(source, /Number\(fee\) \* 100/);
  assert.doesNotMatch(source, /Number\(minor\)/);
});
