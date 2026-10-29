import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { loadSmokeConfiguration, runLoadSmoke } from "./load-smoke-lib.mjs";
import { runStagingAuthenticatedSmoke, stagingSmokeConfiguration } from "./staging-authenticated-smoke.mjs";

const roles = ["customer", "vendor", "admin"];

function boundedSingleLine(value, name, maximum = 512) {
  const normalized = value?.trim();
  assert.ok(normalized && normalized.length <= maximum && !/[\r\n]/.test(normalized), `${name} must be a bounded single-line value`);
  return normalized;
}

export function stagingFirebaseConfiguration(environment) {
  const apiKey = boundedSingleLine(environment.STAGING_FIREBASE_API_KEY, "STAGING_FIREBASE_API_KEY", 256);
  const identities = Object.fromEntries(roles.map((role) => {
    const prefix = `STAGING_${role.toUpperCase()}`;
    const email = boundedSingleLine(environment[`${prefix}_EMAIL`], `${prefix}_EMAIL`, 320);
    assert.match(email, /^[^\s@]+@[^\s@]+\.[^\s@]+$/, `${prefix}_EMAIL must be an email address`);
    const password = boundedSingleLine(environment[`${prefix}_PASSWORD`], `${prefix}_PASSWORD`, 256);
    return [role, { email, password }];
  }));
  return { apiKey, identities };
}

export async function mintStagingFirebaseTokens(configuration, fetcher = fetch) {
  const tokens = {};
  for (const role of roles) {
    const response = await fetcher(new URL(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(configuration.apiKey)}`), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...configuration.identities[role], returnSecureToken: true }),
      redirect: "error",
      signal: AbortSignal.timeout(20_000)
    });
    assert.equal(response.status, 200, `Firebase staging login failed for ${role}`);
    const body = await response.json();
    tokens[role] = boundedSingleLine(body.idToken, `Firebase ${role} idToken`, 16_384);
  }
  return tokens;
}

export async function runStagingAuthenticatedSuite(environment, dependencies = {}) {
  const tokens = await mintStagingFirebaseTokens(stagingFirebaseConfiguration(environment), dependencies.firebaseFetch ?? fetch);
  dependencies.onTokens?.(tokens);
  const authenticated = await runStagingAuthenticatedSmoke(stagingSmokeConfiguration({
    SMOKE_API_URL: environment.SMOKE_API_URL,
    SMOKE_MAX_P95_MS: environment.SMOKE_MAX_P95_MS,
    STAGING_CUSTOMER_TOKEN: tokens.customer,
    STAGING_VENDOR_TOKEN: tokens.vendor,
    STAGING_ADMIN_TOKEN: tokens.admin
  }), dependencies.apiFetch ?? fetch, dependencies.clock);
  const load = await runLoadSmoke(loadSmokeConfiguration({
    LOAD_TARGET_ORIGIN: environment.SMOKE_API_URL,
    LOAD_TARGET_PATH: environment.LOAD_TARGET_PATH,
    LOAD_BEARER_TOKEN: tokens.vendor,
    LOAD_REQUESTS: environment.LOAD_REQUESTS,
    LOAD_CONCURRENCY: environment.LOAD_CONCURRENCY,
    LOAD_WARMUP_REQUESTS: environment.LOAD_WARMUP_REQUESTS,
    LOAD_TIMEOUT_MS: environment.LOAD_TIMEOUT_MS,
    LOAD_MAX_FAILURE_RATE: environment.LOAD_MAX_FAILURE_RATE,
    LOAD_MAX_P95_MS: environment.LOAD_MAX_P95_MS
  }), { fetch: dependencies.apiFetch ?? fetch, now: dependencies.clock });
  return { authenticated, load };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = await runStagingAuthenticatedSuite(process.env, { onTokens: (tokens) => { for (const token of Object.values(tokens)) process.stdout.write(`::add-mask::${token}\n`); } });
  if (process.env.SMOKE_REPORT_PATH) await writeFile(process.env.SMOKE_REPORT_PATH, `${JSON.stringify(result.authenticated.report, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
  if (process.env.LOAD_REPORT_PATH) await writeFile(process.env.LOAD_REPORT_PATH, `${JSON.stringify(result.load, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
  console.log("Authenticated staging role and seller-load smoke checks completed without persisting access tokens.");
  if (!result.authenticated.passed || !result.load.passed) process.exitCode = 1;
}
