import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const coupons = readFileSync(new URL("./AdminCouponsScreen.tsx", import.meta.url), "utf8");
const commission = readFileSync(new URL("./AdminCommissionScreen.tsx", import.meta.url), "utf8");

test("admin coupon totals and monetary fields stay in exact minor units", () => {
  assert.match(coupons, /sumMinor\(/);
  assert.match(coupons, /parseMajorToMinor\(form\.minimumSpend/);
  assert.match(coupons, /minorToMajorInput\(item\.minimumSpendMinor\)/);
  assert.doesNotMatch(coupons, /sum \+ Number\(item\.redeemedMinor\)/);
});

test("commission fixed fees round-trip without floating point", () => {
  assert.match(commission, /parseMajorToMinor\(form\.fixed/);
  assert.match(commission, /minorToMajorInput\(rule\.fixedMinor\)/);
  assert.match(commission, /formatMinor\(rule\.fixedMinor\)/);
  assert.doesNotMatch(commission, /Math\.round\(Number\(form\.fixed/);
  assert.doesNotMatch(commission, /Number\(rule\.fixedMinor\)/);
});
