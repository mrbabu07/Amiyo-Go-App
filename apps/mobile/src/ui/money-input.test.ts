import assert from "node:assert/strict";
import test from "node:test";
import { absoluteMinor, minorToMajorInput, parseMajorToMinor } from "./money";

test("minor units convert to editable decimal text without floating point", () => {
  assert.equal(minorToMajorInput("0"), "0.00");
  assert.equal(minorToMajorInput("105"), "1.05");
  assert.equal(minorToMajorInput("900719925474099312345"), "9007199254740993123.45");
  assert.equal(minorToMajorInput("invalid"), "");
});

test("decimal input converts to exact minor units", () => {
  assert.equal(parseMajorToMinor("1"), 100n);
  assert.equal(parseMajorToMinor("1.5"), 150n);
  assert.equal(parseMajorToMinor("9007199254740993123.45"), 900719925474099312345n);
  assert.equal(parseMajorToMinor("1.005"), null);
  assert.equal(parseMajorToMinor("-1"), null);
  assert.equal(parseMajorToMinor("NaN"), null);
});

test("signed discrepancies become exact absolute minor units", () => {
  assert.equal(absoluteMinor("-900719925474099312345"), 900719925474099312345n);
  assert.equal(absoluteMinor("25"), 25n);
});
