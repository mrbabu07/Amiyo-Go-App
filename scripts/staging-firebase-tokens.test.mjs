import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { mintStagingFirebaseTokens, stagingFirebaseConfiguration, writeGithubTokenOutputs } from "./staging-firebase-tokens.mjs";

const environment = {
  STAGING_FIREBASE_API_KEY: "public-web-key",
  STAGING_CUSTOMER_EMAIL: "customer@example.test",
  STAGING_CUSTOMER_PASSWORD: "customer-password",
  STAGING_VENDOR_EMAIL: "vendor@example.test",
  STAGING_VENDOR_PASSWORD: "vendor-password",
  STAGING_ADMIN_EMAIL: "admin@example.test",
  STAGING_ADMIN_PASSWORD: "admin-password",
  GITHUB_OUTPUT: "output.txt"
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

test("GitHub outputs contain only fresh role tokens", async () => {
  const directory = await mkdtemp(join(tmpdir(), "amiyo-staging-auth-"));
  const outputPath = join(directory, "github-output.txt");
  await writeGithubTokenOutputs(outputPath, { customer: "customer-token", vendor: "vendor-token", admin: "admin-token" });
  assert.equal(await readFile(outputPath, "utf8"), "customer_token=customer-token\nvendor_token=vendor-token\nadmin_token=admin-token\n");
});
