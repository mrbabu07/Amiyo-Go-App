import assert from "node:assert/strict";

const exactKeys = (value, name, allowed) => {
  assert.ok(value && typeof value === "object" && !Array.isArray(value), `${name} must be an object`);
  assert.deepEqual(Object.keys(value).sort(), [...allowed].sort(), `${name} contains missing or unsupported fields`);
};
const bounded = (value, name, pattern, maximum = 120) => {
  assert.equal(typeof value, "string", `${name} is required`);
  const normalized = value.trim();
  assert.ok(normalized.length > 0 && normalized.length <= maximum && !/[\r\n]/.test(normalized) && pattern.test(normalized), `${name} is invalid`);
  return normalized;
};
const instant = (value, name) => {
  const normalized = bounded(value, name, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/);
  const milliseconds = Date.parse(normalized);
  assert.ok(Number.isFinite(milliseconds), `${name} is invalid`);
  return { normalized, milliseconds };
};
const unsigned = (value, name) => bounded(value, name, /^\d+$/, 100);
const signed = (value, name) => bounded(value, name, /^-?\d+$/, 101);

export const parseRestoreReleaseEvidence = (source) => JSON.parse(source.replace(/^\uFEFF/, ""));

export function validateRestoreReleaseEvidence(report, { expectedCommitSha, now = Date.now() } = {}) {
  exactKeys(report, "Evidence", ["schemaVersion", "environment", "commitSha", "runId", "recoveryPointHash", "requestedRecoveryAt", "restoredThroughAt", "restoreStartedAt", "operator", "approver", "apiSmokePassed", "cleanupConfirmed", "verification"]);
  assert.equal(report.schemaVersion, 1, "schemaVersion must be 1");
  assert.equal(report.environment, "recovery-drill", "Restore evidence must come from recovery-drill");
  const commitSha = bounded(report.commitSha, "commitSha", /^[0-9a-f]{40}$/i);
  if (expectedCommitSha) assert.equal(commitSha.toLowerCase(), bounded(expectedCommitSha, "expectedCommitSha", /^[0-9a-f]{40}$/i).toLowerCase(), "Evidence commit does not match the release commit");
  const runId = bounded(report.runId, "runId", /^\d+$/);
  const recoveryPointHash = bounded(report.recoveryPointHash, "recoveryPointHash", /^[0-9a-f]{64}$/i, 64).toLowerCase();
  const requestedRecoveryAt = instant(report.requestedRecoveryAt, "requestedRecoveryAt");
  const restoredThroughAt = instant(report.restoredThroughAt, "restoredThroughAt");
  const restoreStartedAt = instant(report.restoreStartedAt, "restoreStartedAt");
  const operator = bounded(report.operator, "operator", /^[a-zA-Z0-9._ -]+$/, 80);
  const approver = bounded(report.approver, "approver", /^[a-zA-Z0-9._ -]+$/, 80);
  assert.notEqual(operator.toLowerCase(), approver.toLowerCase(), "Restore approval must be independent from execution");
  assert.equal(report.apiSmokePassed, true, "Restored API smoke must pass");
  assert.equal(report.cleanupConfirmed, true, "Isolated restore cleanup must be confirmed");

  const verification = report.verification;
  exactKeys(verification, "verification", ["kind", "measuredAt", "passed", "counts", "totals", "violations", "outbox"]);
  assert.equal(verification.kind, "isolated-postgres-restore-verification", "Unexpected restore verification kind");
  assert.equal(verification.passed, true, "Restore verification did not pass");
  const measuredAt = instant(verification.measuredAt, "verification.measuredAt");
  assert.ok(measuredAt.milliseconds <= now + 5 * 60 * 1000, "Restore evidence cannot be future dated");
  assert.ok(now - measuredAt.milliseconds <= 30 * 24 * 60 * 60 * 1000, "Restore evidence is older than thirty days");
  assert.ok(restoredThroughAt.milliseconds <= requestedRecoveryAt.milliseconds, "restoredThroughAt cannot exceed requestedRecoveryAt");
  const rpoMinutes = (requestedRecoveryAt.milliseconds - restoredThroughAt.milliseconds) / 60_000;
  const rtoMinutes = (measuredAt.milliseconds - restoreStartedAt.milliseconds) / 60_000;
  assert.ok(rpoMinutes >= 0 && rpoMinutes <= 15, "Restore RPO exceeds fifteen minutes");
  assert.ok(rtoMinutes >= 0 && rtoMinutes <= 60, "Restore RTO exceeds sixty minutes");

  exactKeys(verification.counts, "verification.counts", ["users", "vendors", "products", "orders", "payments", "refunds", "ledgerEntries", "outboxEvents"]);
  for (const [key, value] of Object.entries(verification.counts)) unsigned(value, `verification.counts.${key}`);
  exactKeys(verification.totals, "verification.totals", ["orderMinor", "paymentMinor", "paymentRefundedMinor", "completedRefundMinor", "vendorLedgerBalanceMinor"]);
  for (const [key, value] of Object.entries(verification.totals)) signed(value, `verification.totals.${key}`);
  exactKeys(verification.violations, "verification.violations", ["invalid_inventory", "invalid_payments", "invalid_orders", "invalid_ledger_entries", "duplicate_payment_ids", "duplicate_outbox_keys"]);
  for (const [key, value] of Object.entries(verification.violations)) assert.equal(value, "0", `verification.violations.${key} must be zero`);
  exactKeys(verification.outbox, "verification.outbox", ["pending", "failed"]);
  unsigned(verification.outbox.pending, "verification.outbox.pending");
  assert.equal(verification.outbox.failed, "0", "verification.outbox.failed must be zero");

  return { schemaVersion: 1, environment: "recovery-drill", commitSha, runId, recoveryPointHash, requestedRecoveryAt: requestedRecoveryAt.normalized, restoredThroughAt: restoredThroughAt.normalized, restoreStartedAt: restoreStartedAt.normalized, measuredAt: measuredAt.normalized, operator, approver, apiSmokePassed: true, cleanupConfirmed: true, rpoMinutes, rtoMinutes };
}
