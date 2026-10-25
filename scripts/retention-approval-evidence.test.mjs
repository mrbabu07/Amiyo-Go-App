import assert from "node:assert/strict";
import test from "node:test";
import { parseRetentionApprovalEvidence, validateRetentionApprovalEvidence } from "./retention-approval-evidence-lib.mjs";

const hash = "a".repeat(64);
const valid = () => ({ schemaVersion: 1, environment: "production", policyHash: hash, approvedAt: "2026-10-24T10:00:00.000Z", effectiveAt: "2026-10-25T00:00:00.000Z", approvers: { privacyLegal: "Legal Owner", finance: "Finance Owner", operations: "Operations Owner", security: "Security Owner" }, periods: { financialYears: 7, kycEvidenceYears: 7, supportChatYears: 2, auditSecurityYears: 7 }, holds: { owner: "Legal Hold Owner", reviewCadenceDays: 30, tested: true }, providers: Object.fromEntries(["firebase", "sslcommerz", "render", "neon", "redis", "sentry", "resend", "delivery"].map((name) => [name, { configured: true, evidenceHash: hash }])), purgeDrill: { executedAt: "2026-10-24T12:00:00.000Z", operator: "Drill Operator", approver: "Drill Reviewer", reportHash: hash, heldRecordsPreserved: true, eligibleRecordsRemoved: true, noOrphans: true } });

test("retention approval binds independent sign-off, providers and purge evidence", () => {
  const result = validateRetentionApprovalEvidence(valid(), { expectedPolicyHash: hash, now: Date.parse("2026-10-25T00:00:00.000Z") });
  assert.equal(result.providers.neon.configured, true);
  assert.equal(result.purgeDrill.noOrphans, true);
  assert.deepEqual(parseRetentionApprovalEvidence(`\uFEFF${JSON.stringify(valid())}`).periods, valid().periods);
});

test("retention approval rejects policy drift, self approval and incomplete controls", () => {
  assert.throws(() => validateRetentionApprovalEvidence(valid(), { expectedPolicyHash: "b".repeat(64), now: Date.parse("2026-10-25T00:00:00.000Z") }), /current retention policy/);
  const duplicate = valid(); duplicate.approvers.finance = duplicate.approvers.privacyLegal;
  assert.throws(() => validateRetentionApprovalEvidence(duplicate, { expectedPolicyHash: hash }), /four independent people/);
  const provider = valid(); provider.providers.firebase.configured = false;
  assert.throws(() => validateRetentionApprovalEvidence(provider, { expectedPolicyHash: hash }), /must be confirmed/);
  const drill = valid(); drill.purgeDrill.approver = drill.purgeDrill.operator;
  assert.throws(() => validateRetentionApprovalEvidence(drill, { expectedPolicyHash: hash }), /independent/);
});

test("retention approval rejects stale drills and unapproved periods", () => {
  const stale = valid(); stale.purgeDrill.executedAt = "2026-01-01T00:00:00.000Z";
  assert.throws(() => validateRetentionApprovalEvidence(stale, { expectedPolicyHash: hash, now: Date.parse("2026-10-25T00:00:00.000Z") }), /older than ninety days/);
  const period = valid(); period.periods.supportChatYears = 1;
  assert.throws(() => validateRetentionApprovalEvidence(period, { expectedPolicyHash: hash }), /approved baseline/);
});
