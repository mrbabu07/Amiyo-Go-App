import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./AdminCodDeliveryScreen.tsx", import.meta.url), "utf8");

test("COD collection and discrepancy values stay in exact minor units", () => {
  assert.match(source, /parseMajorToMinor\(confirm\.collectedAmount\)/);
  assert.match(source, /minorToMajorInput\(item\.totalMinor\)/);
  assert.match(source, /absoluteMinor\(item\.discrepancyMinor\)/);
  assert.match(source, /formatMinor\(minor\)/);
  assert.doesNotMatch(source, /Math\.round\(Number\(confirm\.collectedAmount\)/);
  assert.doesNotMatch(source, /Math\.abs\(Number\(item\.discrepancyMinor\)/);
});
