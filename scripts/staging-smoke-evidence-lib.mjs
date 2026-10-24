import assert from "node:assert/strict";

const exactKeys = (value, name, allowed) => {
  assert.ok(value && typeof value === "object" && !Array.isArray(value), `${name} must be an object`);
  assert.deepEqual(Object.keys(value).sort(), [...allowed].sort(), `${name} contains missing or unsupported fields`);
};
const bounded = (value, name, pattern, maximum = 200) => {
  assert.equal(typeof value, "string", `${name} is required`);
  const normalized = value.trim();
  assert.ok(normalized.length > 0 && normalized.length <= maximum && !/[\r\n]/.test(normalized) && pattern.test(normalized), `${name} is invalid`);
  return normalized;
};
const instant = (value, name, now) => {
  const normalized = bounded(value, name, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/);
  const milliseconds = Date.parse(normalized);
  assert.ok(Number.isFinite(milliseconds) && milliseconds <= now + 5 * 60 * 1000 && now - milliseconds <= 14 * 24 * 60 * 60 * 1000, `${name} is stale or invalid`);
  return normalized;
};
const secureOrigin = (value, name) => {
  const url = new URL(value);
  assert.ok(url.protocol === "https:" && !url.username && !url.password && url.pathname === "/" && !url.search && !url.hash, `${name} must be an HTTPS origin`);
  return url.origin;
};
const containsForbiddenKey = (value) => value && typeof value === "object" && Object.entries(value).some(([key, nested]) => /token|authorization|password|response_?body/i.test(key) || containsForbiddenKey(nested));

export const parseStagingSmokeEvidence = (source) => JSON.parse(source.replace(/^\uFEFF/, ""));

const validateLoad = (report, name, { authenticated, requests, concurrency, maxP95Ms, origin, now }) => {
  exactKeys(report, name, ["schemaVersion", "measuredAt", "target", "authenticated", "requests", "concurrency", "warmupRequests", "timeoutMs", "failures", "failureRate", "statusCounts", "elapsedMs", "throughputRps", "latencyMs", "thresholds", "passed", "violations"]);
  assert.equal(report.schemaVersion, 1, `${name}.schemaVersion must be 1`);
  instant(report.measuredAt, `${name}.measuredAt`, now);
  const target = new URL(report.target);
  assert.equal(target.origin, origin, `${name} must target the staged origin`);
  assert.equal(report.authenticated, authenticated, `${name}.authenticated is invalid`);
  assert.ok(Number.isInteger(report.requests) && report.requests >= requests, `${name}.requests is below the release threshold`);
  assert.ok(Number.isInteger(report.concurrency) && report.concurrency >= concurrency, `${name}.concurrency is below the release threshold`);
  assert.equal(report.failures, 0, `${name} contains failures`);
  assert.equal(report.failureRate, 0, `${name} failure rate must be zero`);
  assert.equal(report.passed, true, `${name} did not pass`);
  assert.deepEqual(report.violations, [], `${name} contains threshold violations`);
  assert.ok(Number.isFinite(report.latencyMs?.p95) && report.latencyMs.p95 <= maxP95Ms, `${name} p95 exceeds the release threshold`);
  return { measuredAt: report.measuredAt, requests: report.requests, concurrency: report.concurrency, p95Ms: report.latencyMs.p95 };
};

export function validateStagingSmokeEvidence(report, { expectedCommitSha, now = Date.now() } = {}) {
  exactKeys(report, "Evidence", ["schemaVersion", "environment", "commitSha", "runId", "publicContract", "publicLoad", "authenticatedContract", "authenticatedLoad"]);
  assert.equal(containsForbiddenKey(report), false, "Staging evidence contains a forbidden credential or response-body field");
  assert.equal(report.schemaVersion, 1, "schemaVersion must be 1");
  assert.equal(report.environment, "staging", "Only staging smoke evidence is accepted");
  const commitSha = bounded(report.commitSha, "commitSha", /^[0-9a-f]{40}$/i);
  if (expectedCommitSha) assert.equal(commitSha.toLowerCase(), bounded(expectedCommitSha, "expectedCommitSha", /^[0-9a-f]{40}$/i).toLowerCase(), "Evidence commit does not match the release commit");
  const runId = bounded(report.runId, "runId", /^\d+$/);

  const publicContract = report.publicContract;
  exactKeys(publicContract, "publicContract", ["kind", "measuredAt", "origin", "results"]);
  assert.equal(publicContract.kind, "read-only-marketplace-smoke", "Unexpected public smoke kind");
  const origin = secureOrigin(publicContract.origin, "publicContract.origin");
  instant(publicContract.measuredAt, "publicContract.measuredAt", now);
  assert.ok(Array.isArray(publicContract.results), "publicContract.results must be an array");
  assert.ok(publicContract.results.length >= 9 && publicContract.results.every((result) => result.status === "pass"), "Every public contract check must pass");
  for (const path of ["/health", "/ready", "/api/v2/catalog/categories", "/api/v2/catalog/products?limit=2", "/api/v2/shops?limit=2", "/api/v2/orders", "/api/v2/vendor/orders", "/api/v2/admin/workspace"]) assert.ok(publicContract.results.some((result) => result.path === path), `Public smoke is missing ${path}`);

  const authenticatedContract = report.authenticatedContract;
  exactKeys(authenticatedContract, "authenticatedContract", ["kind", "measuredAt", "origin", "summary", "results"]);
  assert.equal(authenticatedContract.kind, "authenticated-staging-marketplace-smoke", "Unexpected authenticated smoke kind");
  assert.equal(secureOrigin(authenticatedContract.origin, "authenticatedContract.origin"), origin, "Authenticated smoke must use the staged origin");
  instant(authenticatedContract.measuredAt, "authenticatedContract.measuredAt", now);
  assert.equal(authenticatedContract.summary?.passed, true, "Authenticated contract smoke did not pass");
  assert.deepEqual(authenticatedContract.summary?.violations, [], "Authenticated contract smoke contains violations");
  assert.ok(authenticatedContract.summary?.latencyMs?.p95 <= 2500, "Authenticated contract p95 exceeds 2500ms");
  assert.ok(Array.isArray(authenticatedContract.results) && authenticatedContract.results.length >= 8 && authenticatedContract.results.every((result) => result.status === "pass"), "Every authenticated contract check must pass");
  for (const role of ["customer", "vendor", "admin"]) assert.ok(authenticatedContract.results.some((result) => result.role === role), `Authenticated smoke is missing ${role}`);

  const publicLoad = validateLoad(report.publicLoad, "publicLoad", { authenticated: false, requests: 250, concurrency: 10, maxP95Ms: 1500, origin, now });
  const authenticatedLoad = validateLoad(report.authenticatedLoad, "authenticatedLoad", { authenticated: true, requests: 40, concurrency: 4, maxP95Ms: 2500, origin, now });
  return { schemaVersion: 1, environment: "staging", commitSha, runId, origin, measuredAt: authenticatedContract.measuredAt, publicChecks: publicContract.results.length, authenticatedChecks: authenticatedContract.results.length, publicLoad, authenticatedLoad };
}
