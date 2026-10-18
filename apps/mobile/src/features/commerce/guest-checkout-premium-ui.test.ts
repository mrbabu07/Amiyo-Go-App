import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./GuestCheckoutScreen.tsx", import.meta.url), "utf8");

test("guest checkout matches the premium responsive checkout language", () => {
  assert.match(source, /styles\.section, premiumStyles\.section/);
  assert.match(source, /styles\.summary, premiumStyles\.summary/);
  assert.match(source, /premiumStyles\.option/);
  assert.match(source, /option: \{ minHeight: 56 \}/);
  assert.match(source, /0 12px 34px rgba\(11,31,58,\.10\)/);
});

test("guest checkout uses theme colors for secure and error states", () => {
  assert.match(source, /secure: \{ alignItems: "center", backgroundColor: colors\.accentSoft/);
  assert.match(source, /secureText: \{ color: colors\.success/);
  assert.match(source, /error: \{ backgroundColor: colors\.primarySoft/);
  assert.doesNotMatch(source, /#ecfdf5|#166534|#fef2f2|#fff/);
});
