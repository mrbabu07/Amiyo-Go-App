import assert from "node:assert/strict";
import test from "node:test";
import { parseFinanceProviderEvidence, validateFinanceProviderEvidence } from "./finance-provider-evidence-lib.mjs";

const now = Date.parse("2026-10-24T12:00:00.000Z");
const commitSha = "a".repeat(40);
const valid = () => ({ schemaVersion: 1, environment: "staging", commitSha, apiRelease: "b".repeat(40), executedAt: "2026-10-24T10:00:00.000Z", operator: "payments-operator", financeApprover: "finance-owner", sslcommerz: { mode: "live", checkout: { transactionHash: "c".repeat(64), captured: true, callbackValidated: true, callbackReplaySafe: true, amountCurrencyMatched: true, localLedgerReconciled: true }, refund: { refundReferenceHash: "d".repeat(64), bankTransactionHash: "e".repeat(64), providerStatus: "refunded", partialRefund: true, amountCurrencyMatched: true, localLedgerReconciled: true } }, payout: { provider: "BKASH", requestHash: "f".repeat(64), providerReferenceHash: "1".repeat(64), referenceFormatApproved: true, walletReserved: true, markedPaid: true, localLedgerReconciled: true }, promotion: { couponApplied: true, automaticPromotionApplied: true, loyaltyApplied: true, capBps: 3500, capVerified: true } });

test("finance evidence binds live provider and reconciliation approval", () => {
  const result = validateFinanceProviderEvidence(valid(), { expectedCommitSha: commitSha, now });
  assert.equal(result.sslcommerz.refund.providerStatus, "refunded");
  assert.equal(result.promotion.capBps, 3500);
});

test("finance evidence accepts PowerShell BOM JSON", () => {
  assert.equal(parseFinanceProviderEvidence(`\uFEFF${JSON.stringify(valid())}`).schemaVersion, 1);
});

test("finance evidence rejects sandbox, self approval and incomplete reconciliation", () => {
  const sandbox = valid(); sandbox.sslcommerz.mode = "sandbox";
  assert.throws(() => validateFinanceProviderEvidence(sandbox, { now }), /live mode/);
  const selfApproved = valid(); selfApproved.financeApprover = selfApproved.operator;
  assert.throws(() => validateFinanceProviderEvidence(selfApproved, { now }), /independent/);
  const incomplete = valid(); incomplete.sslcommerz.refund.localLedgerReconciled = false;
  assert.throws(() => validateFinanceProviderEvidence(incomplete, { now }), /must be confirmed/);
});

test("finance evidence rejects raw references, stale runs and unsupported fields", () => {
  const rawReference = valid(); rawReference.payout.providerReferenceHash = "BKASH-REAL-REFERENCE";
  assert.throws(() => validateFinanceProviderEvidence(rawReference, { now }), /providerReferenceHash is invalid/);
  const stale = valid(); stale.executedAt = "2026-10-01T10:00:00.000Z";
  assert.throws(() => validateFinanceProviderEvidence(stale, { now }), /older than fourteen days/);
  const leaked = valid(); leaked.storePassword = "never-record-this";
  assert.throws(() => validateFinanceProviderEvidence(leaked, { now }), /unsupported fields/);
});
