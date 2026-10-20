import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const source = readFileSync(resolve(import.meta.dirname, "AdminProductCreateScreen.tsx"), "utf8");

test("admin product creation uses exact price conversion", () => {
  assert.match(source, /const priceMinor = parseMajorToMinor\(form\.price\)/);
  assert.match(source, /priceMinor: priceMinor!\.toString\(\)/);
  assert.match(source, /priceMinor > 0n/);
  assert.match(source, /Number\.isInteger\(openingStock\)/);
  assert.doesNotMatch(source, /Math\.round\(Number\(form\.price\) \* 100\)/);
});
