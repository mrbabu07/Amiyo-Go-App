import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { createApiApp } from "../apps/api/dist/server.js";

test("health stays live while failed dependencies make readiness truthful", async () => {
  const app = createApiApp({ readinessCheck: async () => { throw new Error("database unavailable"); } });
  const server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  const address = server.address();
  assert.ok(address && typeof address === "object");
  const base = `http://127.0.0.1:${address.port}`;
  const health = await fetch(`${base}/health`);
  const ready = await fetch(`${base}/ready`);
  assert.equal(health.status, 200);
  assert.equal((await health.json()).status, "ok");
  assert.equal(ready.status, 503);
  assert.equal((await ready.json()).status, "not_ready");
  assert.ok(health.headers.get("content-security-policy"));
  await new Promise((resolve) => server.close(resolve));
});

test("release artifacts enforce immutable builds and non-root containers", async () => {
  const apiDockerfile = await readFile(new URL("../apps/api/Dockerfile", import.meta.url), "utf8");
  const workerDockerfile = await readFile(new URL("../apps/worker/Dockerfile", import.meta.url), "utf8");
  const workflow = await readFile(new URL("../.github/workflows/ci.yml", import.meta.url), "utf8");
  assert.match(apiDockerfile, /USER node/);
  assert.match(apiDockerfile, /\/app\/prisma \.\/prisma/);
  assert.match(workerDockerfile, /USER node/);
  assert.match(workflow, /npm audit --audit-level=high/);
  assert.match(workflow, /docker build/);
});

test("Render blueprint deploys API and worker only after checks pass", async () => {
  const blueprint = await readFile(new URL("../render.yaml", import.meta.url), "utf8");
  assert.match(blueprint, /type: web[\s\S]*name: amiyo-api[\s\S]*healthCheckPath: \/ready/);
  assert.match(blueprint, /preDeployCommand: npm run prisma:migrate:deploy/);
  assert.match(blueprint, /type: worker[\s\S]*name: amiyo-worker/);
  assert.equal((blueprint.match(/autoDeployTrigger: checksPass/g) ?? []).length, 2);
  assert.equal((blueprint.match(/region: singapore/g) ?? []).length, 2);
  assert.doesNotMatch(blueprint, /postgresql:\/\/|redis(?:s)?:\/\/|npg_|BEGIN PRIVATE KEY/);
});

test("deploy workflow validates environment before publishing images", async () => {
  const workflow = await readFile(new URL("../.github/workflows/deploy.yml", import.meta.url), "utf8");
  const preflight = await readFile(new URL("./deployment-env.mjs", import.meta.url), "utf8");
  assert.match(workflow, /preflight:/);
  assert.match(workflow, /^permissions:\n  contents: read\n\nconcurrency:/m);
  assert.match(workflow, /images:[\s\S]*permissions:\n      contents: read\n      packages: write[\s\S]*docker\/login-action/);
  assert.match(workflow, /name: Verify production source branch[\s\S]*inputs\.environment == 'production'[\s\S]*test "\$GITHUB_REF" = "refs\/heads\/main"/);
  assert.match(workflow, /name: Verify release readiness[\s\S]*npm run release:check/);
  assert.match(workflow, /REQUIRE_PRODUCTION_READY: \$\{\{ inputs\.environment == 'production' && 'true' \|\| 'false' \}\}/);
  assert.match(workflow, /RELEASE_REPORT_PATH: release-readiness\.json/);
  assert.match(workflow, /RELEASE_COMMIT_SHA: \$\{\{ github\.sha \}\}/);
  assert.match(workflow, /RELEASE_ENVIRONMENT: \$\{\{ inputs\.environment \}\}/);
  assert.match(workflow, /RELEASE_RUN_ID: \$\{\{ github\.run_id \}\}/);
  assert.match(workflow, /name: release-readiness-\$\{\{ inputs\.environment \}\}-\$\{\{ github\.sha \}\}-\$\{\{ github\.run_attempt \}\}/);
  assert.match(workflow, /npm run release:deploy-env/);
  assert.match(workflow, /needs: preflight/);
  assert.match(workflow, /id: api_image[\s\S]*id: worker_image/);
  assert.match(workflow, /npm run release:manifest/);
  assert.match(workflow, /API_IMAGE_DIGEST: \$\{\{ steps\.api_image\.outputs\.digest \}\}/);
  assert.match(workflow, /WORKER_IMAGE_DIGEST: \$\{\{ steps\.worker_image\.outputs\.digest \}\}/);
  assert.match(workflow, /release-images-\$\{\{ inputs\.environment \}\}-\$\{\{ github\.sha \}\}-\$\{\{ github\.run_attempt \}\}/);
  assert.match(workflow, /group: deploy-\$\{\{ inputs\.environment \}\}/);
  assert.match(preflight, /parseApiEnv\(process\.env\)/);
  assert.match(preflight, /parseWorkerEnv\(process\.env\)/);
  assert.doesNotMatch(preflight, /STORE_PASSWORD|PRIVATE_KEY|INTEGRATION_TOKEN/);
});

test("staging smoke retains public contract and load evidence", async () => {
  const workflow = await readFile(new URL("../.github/workflows/staging-smoke.yml", import.meta.url), "utf8");
  const smoke = await readFile(new URL("./marketplace-smoke.mjs", import.meta.url), "utf8");
  assert.match(workflow, /environment: staging/);
  assert.doesNotMatch(workflow, /include_authenticated|inputs\.include_authenticated/);
  assert.match(workflow, /npm run smoke:marketplace/);
  assert.match(workflow, /npm run smoke:load/);
  assert.match(workflow, /actions\/upload-artifact@v4/);
  assert.match(workflow, /LOAD_MAX_FAILURE_RATE: "0"/);
  assert.match(workflow, /LOAD_TARGET_ORIGIN: \$\{\{ vars\.API_PUBLIC_URL \}\}/);
  assert.match(workflow, /LOAD_TARGET_PATH: \/api\/v2\/vendor\/orders\?limit=1/);
  assert.match(workflow, /LOAD_BEARER_TOKEN: \$\{\{ secrets\.STAGING_VENDOR_TOKEN \}\}/);
  assert.match(workflow, /staging-authenticated-load-smoke\.json/);
  assert.match(smoke, /SMOKE_REPORT_PATH/);
  assert.match(smoke, /flag: "wx"/);
});

test("mobile release uses the hardened Expo SDK and explicit build profiles", async () => {
  const mobilePackage = JSON.parse(await readFile(new URL("../apps/mobile/package.json", import.meta.url), "utf8"));
  const eas = JSON.parse(await readFile(new URL("../apps/mobile/eas.json", import.meta.url), "utf8"));
  assert.match(mobilePackage.dependencies.expo, /57/);
  assert.ok(eas.build.preview);
  assert.ok(eas.build.production);
});

test("production gate remains blocked until external evidence exists", async () => {
  const phase = await readFile(new URL("../docs/phase-10-production-hardening.md", import.meta.url), "utf8");
  assert.match(phase, /Gate status: blocked/);
  assert.match(phase, /not production-ready/);
});
