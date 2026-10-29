import assert from "node:assert/strict";
import test from "node:test";
import { mintStagingFirebaseTokens, runStagingAuthenticatedSuite, stagingFirebaseConfiguration } from "./staging-firebase-tokens.mjs";

const environment = {
  STAGING_FIREBASE_API_KEY: "public-web-key",
  STAGING_CUSTOMER_EMAIL: "customer@example.test",
  STAGING_CUSTOMER_PASSWORD: "customer-password",
  STAGING_VENDOR_EMAIL: "vendor@example.test",
  STAGING_VENDOR_PASSWORD: "vendor-password",
  STAGING_ADMIN_EMAIL: "admin@example.test",
  STAGING_ADMIN_PASSWORD: "admin-password"
};

test("staging Firebase configuration requires every bounded identity", () => {
  assert.throws(() => stagingFirebaseConfiguration({ ...environment, STAGING_VENDOR_PASSWORD: "" }), /STAGING_VENDOR_PASSWORD/);
  assert.throws(() => stagingFirebaseConfiguration({ ...environment, STAGING_ADMIN_EMAIL: "not-an-email" }), /email address/);
  assert.equal(stagingFirebaseConfiguration(environment).identities.vendor.email, "vendor@example.test");
});

test("staging Firebase tokens use the official HTTPS password endpoint without leaking credentials", async () => {
  const configuration = stagingFirebaseConfiguration(environment);
  const calls = [];
  const tokens = await mintStagingFirebaseTokens(configuration, async (url, options) => {
    calls.push({ url, options });
    return { status: 200, json: async () => ({ idToken: `fresh-token-${calls.length}` }) };
  });
  assert.deepEqual(tokens, { customer: "fresh-token-1", vendor: "fresh-token-2", admin: "fresh-token-3" });
  assert.equal(calls.length, 3);
  for (const call of calls) {
    assert.equal(call.url.origin, "https://identitytoolkit.googleapis.com");
    assert.equal(call.url.pathname, "/v1/accounts:signInWithPassword");
    assert.equal(call.options.redirect, "error");
    assert.equal(JSON.parse(call.options.body).returnSecureToken, true);
  }
});

test("authenticated staging suite keeps fresh tokens in memory", async () => {
  const tokens = { customer: "fresh-customer", vendor: "fresh-vendor", admin: "fresh-admin" };
  let firebaseCalls = 0;
  const firebaseFetch = async () => ({ status: 200, json: async () => ({ idToken: Object.values(tokens)[firebaseCalls++] }) });
  const apiFetch = async (url, init) => {
    const token = init?.headers?.Authorization?.replace("Bearer ", "") ?? "";
    const role = Object.entries(tokens).find(([, value]) => value === token)?.[0];
    if (url.pathname === "/api/v2/me") return response(200, { principal: { userId: "00000000-0000-4000-8000-000000000000", roles: [role === "customer" ? "CUSTOMER" : role === "vendor" ? "VENDOR_OWNER" : "SUPER_ADMIN"], vendorIds: [] }, status: "ACTIVE", email: `${role}@example.test`, phone: null, profile: { firstName: null, lastName: null, displayName: role, avatarStorageKey: null, locale: "en", currency: "BDT" }, permissions: [], vendorMemberships: [] });
    if (url.pathname === "/api/v2/vendor/orders") return response(200, { data: [], pageInfo: { nextCursor: null, hasNextPage: false } });
    if (url.pathname === "/api/v2/vendor/finance") return role === "vendor" ? response(200, { vendorId: "00000000-0000-4000-8000-000000000001", balance: { amountMinor: "0", currency: "BDT" }, payoutPolicy: { minimum: { amountMinor: "50000", currency: "BDT" }, holdDays: 7, cadenceDays: 7 }, entries: [], payoutRequests: [] }) : response(403, {});
    if (url.pathname === "/api/v2/admin/workspace") return role === "admin" ? response(200, { users: [], vendors: [], kyc: [], trustCases: [] }) : response(403, {});
    return response(404, {});
  };
  let maskedTokens;
  let time = 0;
  const result = await runStagingAuthenticatedSuite({ ...environment, SMOKE_API_URL: "https://api.example.test", LOAD_TARGET_PATH: "/api/v2/vendor/orders?limit=1", LOAD_REQUESTS: "1", LOAD_CONCURRENCY: "1", LOAD_WARMUP_REQUESTS: "0", LOAD_TIMEOUT_MS: "1000", LOAD_MAX_FAILURE_RATE: "0", LOAD_MAX_P95_MS: "2500" }, { firebaseFetch, apiFetch, clock: () => ++time, onTokens: (value) => { maskedTokens = value; } });
  assert.deepEqual(maskedTokens, tokens);
  assert.equal(result.authenticated.passed, true);
  assert.equal(result.load.passed, true);
  const serialized = JSON.stringify(result);
  for (const token of Object.values(tokens)) assert.equal(serialized.includes(token), false);
});

function response(status, body) {
  return { status, ok: status >= 200 && status < 300, json: async () => body, arrayBuffer: async () => new ArrayBuffer(0) };
}
