import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const files = ["AdminPayoutsScreen.tsx", "AdminPaymentVerificationScreen.tsx", "AdminReturnsScreen.tsx"];

test("admin finance workspaces use exact shared money operations", () => {
  for (const file of files) {
    const source = readFileSync(new URL(`./${file}`, import.meta.url), "utf8");
    assert.match(source, /from "\.\.\/\.\.\/ui\/money"/);
    assert.doesNotMatch(source, /Number\([^\r\n]*amountMinor/);
  }
  const payouts = readFileSync(new URL("./AdminPayoutsScreen.tsx", import.meta.url), "utf8");
  assert.match(payouts, /sumMinor\(items\.map/);
  assert.match(payouts, /BigInt\(item\.amount\.amountMinor\) > 0n/);
});
