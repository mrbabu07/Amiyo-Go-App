import assert from "node:assert/strict";
import test from "node:test";
import { parseStagingSmokeEvidence, validateStagingSmokeEvidence } from "./staging-smoke-evidence-lib.mjs";

const now = Date.parse("2026-10-24T12:00:00.000Z");
const commitSha = "a".repeat(40);
const measuredAt = "2026-10-24T10:00:00.000Z";
const load = (authenticated, requests, concurrency, p95) => ({ schemaVersion: 1, measuredAt, target: `https://api.amiyo.test/api/v2/${authenticated ? "vendor/orders" : "catalog/products"}`, authenticated, requests, concurrency, warmupRequests: 5, timeoutMs: 20000, failures: 0, failureRate: 0, statusCounts: { "200": requests }, elapsedMs: 1000, throughputRps: requests, latencyMs: { p50: 50, p95, p99: p95, max: p95 }, thresholds: { maxFailureRate: 0, maxP95Ms: p95 }, passed: true, violations: [] });
const valid = () => ({ schemaVersion: 1, environment: "staging", commitSha, runId: "123", publicContract: { kind: "read-only-marketplace-smoke", measuredAt, origin: "https://api.amiyo.test", results: ["/health", "/ready", "/api/v2/catalog/categories", "/api/v2/catalog/products?limit=2", "/api/v2/shops?limit=2", "/api/v2/catalog/products/item", "/api/v2/orders", "/api/v2/vendor/orders", "/api/v2/admin/workspace"].map((path) => ({ path, status: "pass", elapsedMs: 10 })) }, publicLoad: load(false, 250, 10, 1000), authenticatedContract: { kind: "authenticated-staging-marketplace-smoke", measuredAt, origin: "https://api.amiyo.test", summary: { checks: 8, passedChecks: 8, latencyMs: { p50: 100, p95: 1000, max: 1000 }, thresholds: { maxP95Ms: 2500 }, violations: [], passed: true }, results: ["customer", "vendor", "admin", "vendor", "customer", "admin", "customer", "vendor"].map((role, index) => ({ role, path: `/check/${index}`, status: "pass", elapsedMs: 100 })) }, authenticatedLoad: load(true, 40, 4, 1500) });

test("staging evidence binds contract, authorization and load reports", () => {
  const result = validateStagingSmokeEvidence(valid(), { expectedCommitSha: commitSha, now });
  assert.equal(result.publicChecks, 9);
  assert.equal(result.authenticatedLoad.requests, 40);
});
test("staging evidence accepts PowerShell BOM JSON", () => assert.equal(parseStagingSmokeEvidence(`\uFEFF${JSON.stringify(valid())}`).schemaVersion, 1));
test("staging evidence rejects failures, weak load and cross-origin reports", () => {
  const failed = valid(); failed.publicContract.results[0].status = "fail";
  assert.throws(() => validateStagingSmokeEvidence(failed, { now }), /Every public contract check/);
  const weak = valid(); weak.publicLoad.requests = 249;
  assert.throws(() => validateStagingSmokeEvidence(weak, { now }), /below the release threshold/);
  const foreign = valid(); foreign.authenticatedContract.origin = "https://other.amiyo.test";
  assert.throws(() => validateStagingSmokeEvidence(foreign, { now }), /staged origin/);
  const leaked = valid(); leaked.authenticatedContract.results[0].token = "never-record-this";
  assert.throws(() => validateStagingSmokeEvidence(leaked, { now }), /forbidden credential/);
});
