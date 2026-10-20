import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { adminWorkspaceSchema, sessionSchema, vendorFinanceSchema, vendorOrderListResponseSchema } from "@amiyo/contracts";

export function stagingSmokeConfiguration(environment) {
  const api = new URL(environment.SMOKE_API_URL || "");
  assert.ok(api.protocol === "https:" && !api.username && !api.password && api.pathname === "/" && !api.search && !api.hash, "SMOKE_API_URL must be an HTTPS origin without credentials or path");
  const tokens = Object.fromEntries(["customer", "vendor", "admin"].map((role) => {
    const token = environment[`STAGING_${role.toUpperCase()}_TOKEN`]?.trim();
    assert.ok(token && token.length <= 16_384 && !/[\r\n]/.test(token), `STAGING_${role.toUpperCase()}_TOKEN must be a bounded single-line token`);
    return [role, token];
  }));
  return { api, tokens, reportPath: environment.SMOKE_REPORT_PATH?.trim() || null };
}

export async function runStagingAuthenticatedSmoke(configuration, fetcher = fetch) {
  const results = [];
  async function check(role, path, expectedStatus, schema, validate) {
    const started = performance.now();
    let actualStatus = null;
    try {
      const response = await fetcher(new URL(path, configuration.api), { headers: { Authorization: `Bearer ${configuration.tokens[role]}` }, redirect: "error", signal: AbortSignal.timeout(30_000) });
      actualStatus = response.status;
      assert.equal(actualStatus, expectedStatus);
      const body = schema ? schema.parse(await response.json()) : null;
      if (validate) validate(body);
      results.push({ role, path, status: "pass", elapsedMs: Math.round(performance.now() - started) });
    } catch (error) {
      results.push({ role, path, status: "fail", expectedStatus, actualStatus, reason: error?.name === "ZodError" ? "Response contract mismatch" : "Unexpected HTTP status, authorization boundary, or network failure" });
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
  const report = { kind: "authenticated-staging-marketplace-smoke", measuredAt: new Date().toISOString(), origin: configuration.api.origin, results };
  return { report, passed: results.every((result) => result.status === "pass") };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const configuration = stagingSmokeConfiguration(process.env);
  const { report, passed } = await runStagingAuthenticatedSmoke(configuration);
  const output = JSON.stringify(report, null, 2);
  console.log(output);
  if (configuration.reportPath) await writeFile(configuration.reportPath, `${output}\n`, { encoding: "utf8", flag: "wx" });
  if (!passed) process.exitCode = 1;
}
