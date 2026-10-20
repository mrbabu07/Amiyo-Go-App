import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const source = readFileSync(resolve(import.meta.dirname, "AdminMarketingScreen.tsx"), "utf8");

test("admin marketing persists entered money as exact minor units", () => {
  assert.match(source, /const taka = \(minor: string \| bigint\) => formatMinor\(minor\)/);
  assert.match(source, /minimumSpendMinor: parseMajorToMinor\(voucher\.minimumSpend \|\| "0"\)!\.toString\(\)/);
  assert.match(source, /priceMinor: parseMajorToMinor\(item\.price\)!\.toString\(\)/);
  assert.match(source, /minorToMajorInput\(rules\.minimumSpendMinor \|\| "0"\)/);
  assert.match(source, /minorToMajorInput\(product\.priceMinor\)/);
  assert.doesNotMatch(source, /Math\.round\(Number\([^)]*\) \* 100\)/);
});
