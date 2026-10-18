import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./CheckoutScreen.tsx", import.meta.url), "utf8");

test("checkout uses premium responsive surfaces and accessible options", () => {
  assert.match(source, /styles\.section, premiumStyles\.section/);
  assert.match(source, /styles\.summary, premiumStyles\.summary/);
  assert.match(source, /styles\.centerCard, premiumStyles\.centerCard/);
  assert.match(source, /option: \{ minHeight: 56 \}/);
  assert.match(source, /0 12px 34px rgba\(11,31,58,\.10\)/);
});

test("checkout status colors come from the active theme", () => {
  assert.match(source, /defaultBadge: \{ backgroundColor: colors\.accentSoft/);
  assert.match(source, /secure: \{ alignItems: "center", backgroundColor: colors\.accentSoft/);
  assert.match(source, /secureText: \{ color: colors\.success/);
  assert.match(source, /error: \{ backgroundColor: colors\.primarySoft/);
  assert.doesNotMatch(source, /#dcfce7|#ecfdf5|#166534|#fef2f2/);
});
