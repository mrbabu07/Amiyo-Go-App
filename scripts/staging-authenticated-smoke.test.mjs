import assert from "node:assert/strict";
import test from "node:test";
import { runStagingAuthenticatedSmoke, stagingSmokeConfiguration } from "./staging-authenticated-smoke.mjs";

const tokenEnv = { STAGING_CUSTOMER_TOKEN: "customer-secret", STAGING_VENDOR_TOKEN: "vendor-secret", STAGING_ADMIN_TOKEN: "admin-secret" };

test("staging authenticated smoke requires HTTPS and bounded role tokens", () => {
  assert.throws(() => stagingSmokeConfiguration({ SMOKE_API_URL: "http://api.example.com", ...tokenEnv }), /HTTPS origin/);
  assert.throws(() => stagingSmokeConfiguration({ SMOKE_API_URL: "https://api.example.com", ...tokenEnv, STAGING_VENDOR_TOKEN: "first\nsecond" }), /single-line token/);
  assert.equal(stagingSmokeConfiguration({ SMOKE_API_URL: "https://api.example.com", ...tokenEnv }).api.origin, "https://api.example.com");
});

test("staging authenticated smoke checks roles without exposing tokens", async () => {
  const configuration = stagingSmokeConfiguration({ SMOKE_API_URL: "https://api.example.com", ...tokenEnv });
  const fetcher = async (url, init) => {
    const token = init.headers.Authorization.replace("Bearer ", "");
    const role = Object.entries(configuration.tokens).find(([, value]) => value === token)?.[0];
    if (url.pathname === "/api/v2/me") return response(200, { principal: { userId: "00000000-0000-4000-8000-000000000000", roles: [role === "customer" ? "CUSTOMER" : role === "vendor" ? "VENDOR_OWNER" : "SUPER_ADMIN"], vendorIds: [] }, status: "ACTIVE", email: `${role}@example.com`, phone: null, profile: { firstName: null, lastName: null, displayName: role, avatarStorageKey: null, locale: "en", currency: "BDT" }, permissions: [], vendorMemberships: [] });
    if (url.pathname === "/api/v2/vendor/orders") return response(200, { data: [], pageInfo: { nextCursor: null, hasNextPage: false } });
    if (url.pathname === "/api/v2/vendor/finance") return role === "vendor" ? response(200, { vendorId: "00000000-0000-4000-8000-000000000001", balance: { amountMinor: "0", currency: "BDT" }, entries: [], payoutRequests: [] }) : response(403, {});
    if (url.pathname === "/api/v2/admin/workspace") return role === "admin" ? response(200, { users: [], vendors: [], kyc: [], trustCases: [] }) : response(403, {});
    return response(404, {});
  };
  const result = await runStagingAuthenticatedSmoke(configuration, fetcher);
  assert.equal(result.passed, true);
  const output = JSON.stringify(result.report);
  for (const token of Object.values(tokenEnv)) assert.equal(output.includes(token), false);
});

function response(status, body) {
  return { status, json: async () => body };
}
