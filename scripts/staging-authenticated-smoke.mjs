import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { adminWorkspaceSchema, sessionSchema, vendorFinanceSchema, vendorOrderListResponseSchema } from "@amiyo/contracts";

function positiveInteger(value, fallback, name) {
  const parsed = Number(value ?? fallback);
  assert.ok(Number.isInteger(parsed) && parsed > 0, `${name} must be a positive integer`);
  return parsed;
}

const percentile = (durations, fraction) => durations[Math.min(durations.length - 1, Math.ceil(durations.length * fraction) - 1)] ?? 0;

export function stagingSmokeConfiguration(environment) {
  const api = new URL(environment.SMOKE_API_URL || "");
  assert.ok(api.protocol === "https:" && !api.username && !api.password && api.pathname === "/" && !api.search && !api.hash, "SMOKE_API_URL must be an HTTPS origin without credentials or path");
  const tokens = Object.fromEntries(["customer", "vendor", "admin"].map((role) => {
    const token = environment[`STAGING_${role.toUpperCase()}_TOKEN`]?.trim();
    assert.ok(token && token.length <= 16_384 && !/[\r\n]/.test(token), `STAGING_${role.toUpperCase()}_TOKEN must be a bounded single-line token`);
    return [role, token];
  }));
  return { api, tokens, maxP95Ms: positiveInteger(environment.SMOKE_MAX_P95_MS, 2_500, "SMOKE_MAX_P95_MS"), reportPath: environment.SMOKE_REPORT_PATH?.trim() || null };
}

export async function runStagingAuthenticatedSmoke(configuration, fetcher = fetch, clock = () => performance.now()) {
  const results = [];
  async function check(role, path, expectedStatus, schema, validate) {
    const started = clock();
    let actualStatus = null;
    try {
      const response = await fetcher(new URL(path, configuration.api), { headers: { Authorization: `Bearer ${configuration.tokens[role]}` }, redirect: "error", signal: AbortSignal.timeout(30_000) });
      actualStatus = response.status;
      assert.equal(actualStatus, expectedStatus);
      const body = schema ? schema.parse(await response.json()) : null;
      if (validate) validate(body);
      results.push({ role, path, status: "pass", elapsedMs: Math.round(clock() - started) });
    } catch (error) {
      results.push({ role, path, status: "fail", expectedStatus, actualStatus, reason: error?.name === "ZodError" ? "Response contract mismatch" : "Unexpected HTTP status, authorization boundary, or network failure", elapsedMs: Math.round(clock() - started) });
    }
  }
  const expectedRoles = { customer: "CUSTOMER", vendor: "VENDOR_OWNER", admin: "SUPER_ADMIN" };
  for (const role of Object.keys(expectedRoles)) await check(role, "/api/v2/me", 200, sessionSchema, (session) => assert.ok(session.principal.roles.includes(expectedRoles[role])));
  await check("vendor", "/api/v2/vendor/orders?limit=1", 200, vendorOrderListResponseSchema);
  await check("vendor", "/api/v2/vendor/finance", 200, vendorFinanceSchema);
  await check("customer", "/api/v2/vendor/finance", 403);
  await check("admin", "/api/v2/admin/workspace", 200, adminWorkspaceSchema);
  await check("customer", "/api/v2/admin/workspace", 403);
  await check("vendor", "/api/v2/admin/workspace", 403);
  const durations = results.filter((result) => result.status === "pass").map((result) => result.elapsedMs).sort((left, right) => left - right);
  const p95Ms = Math.round(percentile(durations, 0.95));
  const violations = p95Ms > configuration.maxP95Ms ? [`authenticated p95 ${p95Ms}ms exceeds ${configuration.maxP95Ms}ms`] : [];
  const passed = results.every((result) => result.status === "pass") && violations.length === 0;
  const report = { kind: "authenticated-staging-marketplace-smoke", measuredAt: new Date().toISOString(), origin: configuration.api.origin, summary: { checks: results.length, passedChecks: results.filter((result) => result.status === "pass").length, latencyMs: { p50: Math.round(percentile(durations, 0.5)), p95: p95Ms, max: Math.round(durations.at(-1) ?? 0) }, thresholds: { maxP95Ms: configuration.maxP95Ms }, violations, passed }, results };
  return { report, passed };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const configuration = stagingSmokeConfiguration(process.env);
  const { report, passed } = await runStagingAuthenticatedSmoke(configuration);
  const output = JSON.stringify(report, null, 2);
  console.log(output);
  if (configuration.reportPath) await writeFile(configuration.reportPath, `${output}\n`, { encoding: "utf8", flag: "wx" });
  if (!passed) process.exitCode = 1;
}
