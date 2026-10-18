import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./CustomerReturnWizard.tsx", import.meta.url), "utf8");

test("return wizard presents a guided customer journey", () => {
  assert.match(source, /Choose an order/);
  assert.match(source, /Choose a seller package/);
  assert.match(source, /Return details/);
  assert.match(source, /Available to request a return/);
  assert.match(source, /Saved request needs attention/);
});

test("return wizard uses premium accessible controls", () => {
  assert.match(source, /boxShadow: "0 12px 34px rgba\(11,31,58,\.10\)"/);
  assert.match(source, /minHeight: 56/);
  assert.match(source, /accessibilityRole="alert"/);
  assert.match(source, /accessibilityState=\{\{ disabled \}\}/);
  assert.doesNotMatch(source, /Â·|#fff/);
});
