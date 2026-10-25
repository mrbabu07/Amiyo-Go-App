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
const hash = (value, name) => bounded(value, name, /^[0-9a-f]{64}$/i, 64).toLowerCase();
const confirmed = (value, name) => assert.equal(value, true, `${name} must be confirmed`);

export const parseRetentionApprovalEvidence = (source) => JSON.parse(source.replace(/^\uFEFF/, ""));

export function validateRetentionApprovalEvidence(report, { expectedPolicyHash, now = Date.now() } = {}) {
  exactKeys(report, "Evidence", ["schemaVersion", "environment", "policyHash", "approvedAt", "effectiveAt", "approvers", "periods", "holds", "providers", "purgeDrill"]);
  assert.equal(report.schemaVersion, 1, "schemaVersion must be 1");
  assert.equal(report.environment, "production", "Only production retention approval is accepted");
  const policyHash = hash(report.policyHash, "policyHash");
  if (expectedPolicyHash) assert.equal(policyHash, hash(expectedPolicyHash, "expectedPolicyHash"), "Approval does not match the current retention policy");
  const approvedAt = instant(report.approvedAt, "approvedAt");
  const effectiveAt = instant(report.effectiveAt, "effectiveAt");
  assert.ok(approvedAt.milliseconds <= now + 5 * 60_000, "Approval cannot be future dated");
  assert.ok(effectiveAt.milliseconds >= approvedAt.milliseconds, "effectiveAt cannot precede approval");

  exactKeys(report.approvers, "approvers", ["privacyLegal", "finance", "operations", "security"]);
  const approvers = Object.fromEntries(Object.entries(report.approvers).map(([role, value]) => [role, bounded(value, `approvers.${role}`, /^[a-zA-Z0-9._ -]+$/, 80)]));
  assert.equal(new Set(Object.values(approvers).map((value) => value.toLowerCase())).size, 4, "Retention approvals must name four independent people");

  exactKeys(report.periods, "periods", ["financialYears", "kycEvidenceYears", "supportChatYears", "auditSecurityYears"]);
  assert.deepEqual(report.periods, { financialYears: 7, kycEvidenceYears: 7, supportChatYears: 2, auditSecurityYears: 7 }, "Retention periods do not match the approved baseline");
  exactKeys(report.holds, "holds", ["owner", "reviewCadenceDays", "tested"]);
  const holdOwner = bounded(report.holds.owner, "holds.owner", /^[a-zA-Z0-9._ -]+$/, 80);
  assert.ok(Number.isInteger(report.holds.reviewCadenceDays) && report.holds.reviewCadenceDays >= 1 && report.holds.reviewCadenceDays <= 90, "holds.reviewCadenceDays must be between 1 and 90");
  confirmed(report.holds.tested, "holds.tested");

  const providerNames = ["firebase", "sslcommerz", "render", "neon", "redis", "sentry", "resend", "delivery"];
  exactKeys(report.providers, "providers", providerNames);
  const providers = {};
  for (const name of providerNames) {
    exactKeys(report.providers[name], `providers.${name}`, ["configured", "evidenceHash"]);
    confirmed(report.providers[name].configured, `providers.${name}.configured`);
    providers[name] = { configured: true, evidenceHash: hash(report.providers[name].evidenceHash, `providers.${name}.evidenceHash`) };
  }

  exactKeys(report.purgeDrill, "purgeDrill", ["executedAt", "operator", "approver", "reportHash", "heldRecordsPreserved", "eligibleRecordsRemoved", "noOrphans"]);
  const drillAt = instant(report.purgeDrill.executedAt, "purgeDrill.executedAt");
  assert.ok(drillAt.milliseconds <= now + 5 * 60_000, "Purge drill cannot be future dated");
  assert.ok(now - drillAt.milliseconds <= 90 * 24 * 60 * 60_000, "Purge drill is older than ninety days");
  const operator = bounded(report.purgeDrill.operator, "purgeDrill.operator", /^[a-zA-Z0-9._ -]+$/, 80);
  const approver = bounded(report.purgeDrill.approver, "purgeDrill.approver", /^[a-zA-Z0-9._ -]+$/, 80);
  assert.notEqual(operator.toLowerCase(), approver.toLowerCase(), "Purge drill approval must be independent from execution");
  for (const field of ["heldRecordsPreserved", "eligibleRecordsRemoved", "noOrphans"]) confirmed(report.purgeDrill[field], `purgeDrill.${field}`);

  return { schemaVersion: 1, environment: "production", policyHash, approvedAt: approvedAt.normalized, effectiveAt: effectiveAt.normalized, approvers, periods: report.periods, holds: { owner: holdOwner, reviewCadenceDays: report.holds.reviewCadenceDays, tested: true }, providers, purgeDrill: { executedAt: drillAt.normalized, operator, approver, reportHash: hash(report.purgeDrill.reportHash, "purgeDrill.reportHash"), heldRecordsPreserved: true, eligibleRecordsRemoved: true, noOrphans: true } };
}
