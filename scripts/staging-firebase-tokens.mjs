import assert from "node:assert/strict";
import { appendFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

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
  const outputPath = boundedSingleLine(environment.GITHUB_OUTPUT, "GITHUB_OUTPUT", 4_096);
  return { apiKey, identities, outputPath };
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

export async function writeGithubTokenOutputs(outputPath, tokens) {
  const lines = roles.map((role) => `${role}_token=${tokens[role]}\n`).join("");
  await appendFile(outputPath, lines, { encoding: "utf8" });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const configuration = stagingFirebaseConfiguration(process.env);
  const tokens = await mintStagingFirebaseTokens(configuration);
  for (const token of Object.values(tokens)) process.stdout.write(`::add-mask::${token}\n`);
  await writeGithubTokenOutputs(configuration.outputPath, tokens);
  console.log("Fresh staging Firebase tokens prepared for customer, vendor, and admin smoke checks.");
}
