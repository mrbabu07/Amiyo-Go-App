import assert from "node:assert/strict";
import test from "node:test";
import { parseMobileDeviceEvidence, requiredMobileFlows, validateMobileDeviceEvidence } from "./mobile-device-evidence-lib.mjs";

const now = Date.parse("2026-10-24T12:00:00.000Z");
const commitSha = "a".repeat(40);
const valid = () => ({
  schemaVersion: 1,
  environment: "staging",
  commitSha,
  apiRelease: "b".repeat(40),
  tester: "release-operator",
  startedAt: "2026-10-24T10:00:00.000Z",
  finishedAt: "2026-10-24T10:20:00.000Z",
  app: { platform: "android", packageId: "com.amiyo.go", buildId: "preview-20261024.1" },
  device: { kind: "physical", model: "Pixel 8", osVersion: "Android 16" },
  flows: requiredMobileFlows.map((name) => ({ name, status: "passed", durationSeconds: 30, screenshotCount: 1 }))
});

test("mobile evidence binds every passing flow to one staged release", () => {
  const result = validateMobileDeviceEvidence(valid(), { expectedCommitSha: commitSha, now });
  assert.equal(result.flows.length, requiredMobileFlows.length);
  assert.equal(result.app.packageId, "com.amiyo.go");
});

test("mobile evidence accepts standard and PowerShell BOM JSON", () => {
  assert.equal(parseMobileDeviceEvidence(JSON.stringify(valid())).schemaVersion, 1);
  assert.equal(parseMobileDeviceEvidence(`\uFEFF${JSON.stringify(valid())}`).schemaVersion, 1);
});

test("mobile evidence rejects missing, failed, stale and mismatched runs", () => {
  const missing = valid();
  missing.flows.pop();
  assert.throws(() => validateMobileDeviceEvidence(missing, { expectedCommitSha: commitSha, now }), /Every required mobile flow/);
  const failed = valid();
  failed.flows[0].status = "failed";
  assert.throws(() => validateMobileDeviceEvidence(failed, { expectedCommitSha: commitSha, now }), /did not pass/);
  const stale = valid();
  stale.startedAt = "2026-10-01T10:00:00.000Z";
  stale.finishedAt = "2026-10-01T10:20:00.000Z";
  assert.throws(() => validateMobileDeviceEvidence(stale, { expectedCommitSha: commitSha, now }), /older than fourteen days/);
  assert.throws(() => validateMobileDeviceEvidence(valid(), { expectedCommitSha: "c".repeat(40), now }), /does not match/);
});

test("mobile evidence rejects unbounded metadata and absent screenshots", () => {
  const unsafe = valid();
  unsafe.tester = "operator\nsecret";
  assert.throws(() => validateMobileDeviceEvidence(unsafe, { now }), /tester is invalid/);
  const noScreenshot = valid();
  noScreenshot.flows[0].screenshotCount = 0;
  assert.throws(() => validateMobileDeviceEvidence(noScreenshot, { now }), /screenshotCount is invalid/);
  const leaked = valid();
  leaked.token = "must-not-be-recorded";
  assert.throws(() => validateMobileDeviceEvidence(leaked, { now }), /unsupported fields/);
});
