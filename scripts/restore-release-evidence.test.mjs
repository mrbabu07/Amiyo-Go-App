import assert from "node:assert/strict";
import test from "node:test";
import { parseRestoreReleaseEvidence, validateRestoreReleaseEvidence } from "./restore-release-evidence-lib.mjs";

const now = Date.parse("2026-10-24T12:00:00.000Z");
const commitSha = "a".repeat(40);
const valid = () => ({ schemaVersion: 1, environment: "recovery-drill", commitSha, runId: "1234", recoveryPointHash: "b".repeat(64), requestedRecoveryAt: "2026-10-24T10:00:00.000Z", restoredThroughAt: "2026-10-24T09:50:00.000Z", restoreStartedAt: "2026-10-24T10:05:00.000Z", operator: "recovery-operator", approver: "platform-owner", apiSmokePassed: true, cleanupConfirmed: true, verification: { kind: "isolated-postgres-restore-verification", measuredAt: "2026-10-24T10:45:00.000Z", passed: true, counts: { users: "10", vendors: "2", products: "20", orders: "5", payments: "5", refunds: "1", ledgerEntries: "4", outboxEvents: "3" }, totals: { orderMinor: "50000", paymentMinor: "50000", paymentRefundedMinor: "1000", completedRefundMinor: "1000", vendorLedgerBalanceMinor: "25000" }, violations: { invalid_inventory: "0", invalid_payments: "0", invalid_orders: "0", invalid_ledger_entries: "0", duplicate_payment_ids: "0", duplicate_outbox_keys: "0" }, outbox: { pending: "1", failed: "0" } } });

test("restore release evidence proves bounded RPO, RTO and reconciliation", () => {
  const result = validateRestoreReleaseEvidence(valid(), { expectedCommitSha: commitSha, now });
  assert.equal(result.rpoMinutes, 10);
  assert.equal(result.rtoMinutes, 40);
});

test("restore release evidence accepts PowerShell BOM JSON", () => {
  assert.equal(parseRestoreReleaseEvidence(`\uFEFF${JSON.stringify(valid())}`).schemaVersion, 1);
});

test("restore release evidence rejects stale, slow and unsafe drills", () => {
  const slow = valid(); slow.verification.measuredAt = "2026-10-24T11:06:00.000Z";
  assert.throws(() => validateRestoreReleaseEvidence(slow, { now }), /RTO exceeds/);
  const broken = valid(); broken.verification.violations.invalid_orders = "1";
  assert.throws(() => validateRestoreReleaseEvidence(broken, { now }), /must be zero/);
  const selfApproved = valid(); selfApproved.approver = selfApproved.operator;
  assert.throws(() => validateRestoreReleaseEvidence(selfApproved, { now }), /independent/);
  const leaked = valid(); leaked.databaseUrl = "not-allowed";
  assert.throws(() => validateRestoreReleaseEvidence(leaked, { now }), /unsupported fields/);
});
