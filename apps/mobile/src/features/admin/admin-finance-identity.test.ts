import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { URL } from "node:url";

const payment = readFileSync(new URL("./AdminPaymentVerificationScreen.tsx", import.meta.url), "utf8");
const payouts = readFileSync(new URL("./AdminPayoutsScreen.tsx", import.meta.url), "utf8");
const api = readFileSync(new URL("./admin.api.ts", import.meta.url), "utf8");

test("admin finance queries and mutations stay scoped to the current identity", () => {
  for (const source of [payment, payouts]) {
    assert.match(source, /useCurrentUser/);
    assert.match(source, /userId/);
    assert.match(source, /Account changed/);
    assert.doesNotMatch(source, /firebaseAuth/);
  }
  assert.match(payment, /\["admin", "payment-verifications", userId\]/);
  assert.match(payouts, /\["admin", "payouts", userId\]/);
  assert.match(payouts, /\["admin", "settlement-proposals", userId\]/);
});

test("payment evidence uses audited access without exposing storage keys", () => {
  assert.match(payment, /accessAdminPaymentEvidence/);
  assert.match(payment, /Linking\.openURL/);
  assert.doesNotMatch(payment, /evidenceStorageKey/);
  assert.match(api, /paymentVerificationEvidenceAccessSchema\.parse/);
  assert.doesNotMatch(api, /evidenceStorageKey: string/);
});
