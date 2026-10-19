import assert from "node:assert/strict";
import test from "node:test";
import { formatMinor, sumMinor } from "../../ui/money";

test("seller money formatting preserves exact minor units and Bangladesh grouping", () => {
  assert.equal(formatMinor("0"), "৳0");
  assert.equal(formatMinor("1"), "৳0.01");
  assert.equal(formatMinor("100"), "৳1");
  assert.equal(formatMinor("123456789"), "৳12,34,567.89");
  assert.equal(formatMinor("-1250"), "৳-12.50");
  assert.equal(formatMinor("100", "USD", 2), "USD 1.00");
  assert.equal(formatMinor("invalid"), "৳—");
});

test("seller financial totals remain exact beyond JavaScript safe integers", () => {
  assert.equal(sumMinor(["9007199254740993", "7", -10n]), 9007199254740990n);
});
