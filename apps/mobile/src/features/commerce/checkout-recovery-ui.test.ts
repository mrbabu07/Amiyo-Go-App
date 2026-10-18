import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./CheckoutRecovery.tsx", import.meta.url), "utf8");

test("checkout recovery presents safe status and ordered actions", () => {
  assert.match(source, /Your checkout details are protected/);
  assert.match(source, /Recovery window expired/);
  assert.match(source, /accessibilityState=\{\{ busy, disabled: busy \|\| expired \}\}/);
  assert.match(source, /Retry original checkout/);
  assert.match(source, /View my orders/);
  assert.match(source, /Contact support/);
});

test("checkout recovery uses premium accessible surfaces", () => {
  assert.match(source, /boxShadow: "0 12px 34px rgba\(11,31,58,\.10\)"/);
  assert.match(source, /minHeight: 50/);
  assert.match(source, /accessibilityRole="alert"/);
  assert.doesNotMatch(source, /Recoveringâ€¦|#fff/);
});
