import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const activity = readFileSync(new URL("./AdminVendorActivityScreen.tsx", import.meta.url), "utf8");
const detail = readFileSync(new URL("./AdminVendorDetailScreen.tsx", import.meta.url), "utf8");

test("vendor activity ranks and aggregates exact minor-unit totals", () => {
  assert.match(activity, /compareMinor\(b\.gmvMinor, a\.gmvMinor\)/);
  assert.match(activity, /sumMinor\(orders\.map/);
  assert.match(activity, /gmv \/ BigInt\(orders\.length\)/);
  assert.doesNotMatch(activity, /Number\(b\.gmvMinor\)/);
  assert.doesNotMatch(activity, /sum \+ Number\(item\.totalMinor\)/);
});

test("vendor 360 displays GMV without floating point", () => {
  assert.match(detail, /formatMinor\(activity\?\.gmvMinor \?\? "0"\)/);
  assert.doesNotMatch(detail, /Number\(activity\?\.gmvMinor/);
});
