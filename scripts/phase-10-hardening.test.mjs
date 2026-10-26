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
  const dependabot = await readFile(new URL("../.github/dependabot.yml", import.meta.url), "utf8");
  const codeowners = await readFile(new URL("../.github/CODEOWNERS", import.meta.url), "utf8");
  const securityPolicy = await readFile(new URL("../SECURITY.md", import.meta.url), "utf8");
  const pullRequestTemplate = await readFile(new URL("../.github/pull_request_template.md", import.meta.url), "utf8");
  assert.match(apiDockerfile, /USER node/);
  assert.match(apiDockerfile, /\/app\/prisma \.\/prisma/);
  assert.match(workerDockerfile, /USER node/);
  assert.doesNotMatch(apiDockerfile, /^FROM\s+[^\s@]+(?=\s|$)/m);
  assert.doesNotMatch(workerDockerfile, /^FROM\s+[^\s@]+(?=\s|$)/m);
  assert.equal((apiDockerfile.match(/node:20-alpine@sha256:[0-9a-f]{64}/g) ?? []).length, 2);
  assert.equal((workerDockerfile.match(/node:20-alpine@sha256:[0-9a-f]{64}/g) ?? []).length, 2);
  assert.match(apiDockerfile, /org\.opencontainers\.image\.revision=\$RELEASE_COMMIT_SHA/);
  assert.match(workerDockerfile, /org\.opencontainers\.image\.revision=\$RELEASE_COMMIT_SHA/);
  assert.match(apiDockerfile, /npm ci --omit=dev --workspace @amiyo\/api --include-workspace-root/);
  assert.match(workerDockerfile, /npm ci --omit=dev --workspace @amiyo\/worker --include-workspace-root/);
  assert.match(workflow, /npm audit --audit-level=high/);
  assert.match(workflow, /docker build/);
  assert.equal((workflow.match(/--build-arg RELEASE_COMMIT_SHA=\$\{\{ github\.sha \}\}/g) ?? []).length, 2);
  assert.match(workflow, /name: Verify container runtime contracts/);
  assert.match(workflow, /node amiyo-api:\$\{\{ github\.sha \}\} --check apps\/api\/dist\/index\.js/);
  assert.match(workflow, /node amiyo-worker:\$\{\{ github\.sha \}\} --check apps\/worker\/dist\/index\.js/);
  assert.equal((workflow.match(/process\.getuid\?\.\(\) === 0/g) ?? []).length, 2);
  assert.equal((workflow.match(/\['expo','firebase-tools'\]/g) ?? []).length, 2);
  assert.match(workflow, /require\.resolve\('express'\)/);
  assert.match(workflow, /require\.resolve\('bullmq'\)/);
  assert.equal((workflow.match(/org\.opencontainers\.image\.revision/g) ?? []).length, 2);
  assert.doesNotMatch(workflow, /uses:\s+[^\s]+@v\d+/);
  assert.match(workflow, /RELEASE_REPORT_PATH: ci-release-readiness\.json/);
  assert.match(workflow, /RELEASE_ENVIRONMENT: ci/);
  assert.match(workflow, /name: ci-release-readiness-\$\{\{ github\.sha \}\}-\$\{\{ github\.run_attempt \}\}/);
  assert.ok(workflow.indexOf("npm run export:web --workspace @amiyo/mobile") < workflow.indexOf("npm audit --audit-level=high"));
  assert.match(dependabot, /package-ecosystem: npm/);
  assert.match(dependabot, /package-ecosystem: github-actions/);
  assert.equal((dependabot.match(/package-ecosystem: docker/g) ?? []).length, 2);
  assert.match(dependabot, /timezone: Asia\/Dhaka/);
  assert.match(dependabot, /expo-runtime:[\s\S]*"@expo\/\*"[\s\S]*"@react-native\/\*"/);
  assert.match(codeowners, /^\* @mrbabu07$/m);
  assert.match(codeowners, /^\/\.github\/ @mrbabu07$/m);
  assert.match(codeowners, /^\/prisma\/ @mrbabu07$/m);
  assert.match(codeowners, /^\/apps\/api\/src\/modules\/identity\/ @mrbabu07$/m);
  assert.match(codeowners, /^\/apps\/api\/src\/modules\/commerce\/ @mrbabu07$/m);
  assert.match(codeowners, /^\/apps\/api\/src\/modules\/orders\/ @mrbabu07$/m);
  assert.match(securityPolicy, /GitHub Security Advisory/);
  assert.match(securityPolicy, /Never include passwords, access tokens, private keys/);
  assert.match(pullRequestTemplate, /authorization boundaries/);
  assert.match(pullRequestTemplate, /No unresolved business decision/);
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
  assert.doesNotMatch(workflow, /uses:\s+[^\s]+@v\d+/);
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
  assert.equal((workflow.match(/provenance: mode=max/g) ?? []).length, 2);
  assert.equal((workflow.match(/sbom: true/g) ?? []).length, 2);
  assert.equal((workflow.match(/RELEASE_COMMIT_SHA=\$\{\{ github\.sha \}\}/g) ?? []).length, 2);
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
  assert.doesNotMatch(workflow, /uses:\s+[^\s]+@v\d+/);
  assert.doesNotMatch(workflow, /include_authenticated|inputs\.include_authenticated/);
  assert.match(workflow, /npm run smoke:marketplace/);
  assert.match(workflow, /npm run smoke:load/);
  assert.match(workflow, /npm run smoke:staging-preflight/);
  assert.match(workflow, /API_PUBLIC_URL: \$\{\{ vars\.API_PUBLIC_URL \}\}/);
  assert.match(workflow, /LOAD_TARGET_URL: \$\{\{ vars\.LOAD_TARGET_URL \}\}/);
  assert.match(workflow, /actions\/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02 # v4/);
  assert.match(workflow, /LOAD_MAX_FAILURE_RATE: "0"/);
  assert.match(workflow, /LOAD_TARGET_ORIGIN: \$\{\{ vars\.API_PUBLIC_URL \}\}/);
  assert.match(workflow, /LOAD_TARGET_PATH: \/api\/v2\/vendor\/orders\?limit=1/);
  assert.match(workflow, /node scripts\/staging-firebase-tokens\.mjs/);
  assert.match(workflow, /LOAD_BEARER_TOKEN: \$\{\{ steps\.staging_auth\.outputs\.vendor_token \}\}/);
  assert.match(workflow, /staging-authenticated-load-smoke\.json/);
  assert.match(smoke, /SMOKE_REPORT_PATH/);
  assert.match(smoke, /flag: "wx"/);
});

test("mobile release uses the hardened Expo SDK and explicit build profiles", async () => {
  const mobilePackage = JSON.parse(await readFile(new URL("../apps/mobile/package.json", import.meta.url), "utf8"));
  const eas = JSON.parse(await readFile(new URL("../apps/mobile/eas.json", import.meta.url), "utf8"));
  assert.match(mobilePackage.dependencies.expo, /58/);
  assert.ok(eas.build.preview);
  assert.ok(eas.build.production);
});

test("dependency register matches the current pinned tooling and gate snapshot", async () => {
  const rootPackage = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
  const lock = JSON.parse(await readFile(new URL("../package-lock.json", import.meta.url), "utf8"));
  const register = await readFile(new URL("../docs/dependency-risk-register.md", import.meta.url), "utf8");
  const gapMap = await readFile(new URL("../docs/production-gap-and-differentiator-map.md", import.meta.url), "utf8");
  assert.equal(rootPackage.devDependencies["firebase-tools"], "15.34.1");
  assert.equal(lock.packages["node_modules/fast-uri"].version, "3.1.9");
  assert.match(register, /Last reviewed: 2026-10-26/);
  assert.match(register, /firebase-tools@15\.34\.1/);
  assert.match(register, /fast-uri@3\.1\.9/);
  assert.match(register, /five high and five moderate package nodes/);
  assert.match(register, /1,109-test run pass/);
  assert.match(gapMap, /Current gate snapshot \(2026-10-25\)/);
  assert.match(gapMap, /one unresolved business decision/);
  assert.match(gapMap, /passed 1,109 tests/);
});

test("runtime contracts use the remediated Zod and OpenAPI toolchain", async () => {
  const apiPackage = JSON.parse(await readFile(new URL("../apps/api/package.json", import.meta.url), "utf8"));
  const mobilePackage = JSON.parse(await readFile(new URL("../apps/mobile/package.json", import.meta.url), "utf8"));
  const configPackage = JSON.parse(await readFile(new URL("../packages/config/package.json", import.meta.url), "utf8"));
  const contractsPackage = JSON.parse(await readFile(new URL("../packages/contracts/package.json", import.meta.url), "utf8"));
  const zodBootstrap = await readFile(new URL("../packages/contracts/src/zod.ts", import.meta.url), "utf8");
  for (const version of [apiPackage.dependencies.zod, mobilePackage.dependencies.zod, configPackage.dependencies.zod, contractsPackage.dependencies.zod]) assert.match(version, /4\.6\.7/);
  assert.match(contractsPackage.dependencies["@asteasolutions/zod-to-openapi"], /9\.1\.0/);
  assert.match(zodBootstrap, /extendZodWithOpenApi\(z\)/);
});

test("production gate remains blocked until external evidence exists", async () => {
  const phase = await readFile(new URL("../docs/phase-10-production-hardening.md", import.meta.url), "utf8");
  const workflow = await readFile(new URL("../.github/workflows/deploy.yml", import.meta.url), "utf8");
  const readiness = await readFile(new URL("./release-readiness.mjs", import.meta.url), "utf8");
  assert.match(phase, /Gate status: blocked/);
  assert.match(phase, /not production-ready/);
  assert.match(workflow, /ANDROID_DEVICE_EVIDENCE_JSON: \$\{\{ secrets\.ANDROID_DEVICE_EVIDENCE_JSON \}\}/);
  assert.match(workflow, /IOS_DEVICE_EVIDENCE_JSON: \$\{\{ secrets\.IOS_DEVICE_EVIDENCE_JSON \}\}/);
  assert.match(workflow, /FINANCE_PROVIDER_EVIDENCE_JSON: \$\{\{ secrets\.FINANCE_PROVIDER_EVIDENCE_JSON \}\}/);
  assert.match(workflow, /RESTORE_RELEASE_EVIDENCE_JSON: \$\{\{ secrets\.RESTORE_RELEASE_EVIDENCE_JSON \}\}/);
  assert.match(workflow, /STAGING_SMOKE_EVIDENCE_JSON: \$\{\{ secrets\.STAGING_SMOKE_EVIDENCE_JSON \}\}/);
  assert.match(workflow, /RETENTION_APPROVAL_EVIDENCE_JSON: \$\{\{ secrets\.RETENTION_APPROVAL_EVIDENCE_JSON \}\}/);
  assert.match(workflow, /RETENTION_APPROVAL_EVIDENCE_PATH:/);
  assert.match(readiness, /evidenceRequired/);
  assert.match(readiness, /releaseEvidence/);
  assert.match(readiness, /retentionPolicyHash/);
});

test("release-one market boundaries are explicitly approved", async () => {
  const [decisions, policy] = await Promise.all([
    readFile(new URL("../docs/decisions-needed.md", import.meta.url), "utf8"),
    readFile(new URL("../docs/release-one-operating-policy.md", import.meta.url), "utf8")
  ]);
  for (const decision of ["Supported countries", "Languages", "Currency and rounding", "Release-one roles", "Guest checkout", "Authentication", "Account deletion", "Payments", "Order split", "Product approval", "Commission precedence", "Rider contact exposure", "COD split collection", "Vendor pickup address", "Geography", "KYC", "Cancellation", "Returns", "Migration exports", "Deployment targets"]) {
    assert.match(decisions, new RegExp(`\\| ${decision.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&")} \\| IMPLEMENTED \\|`));
  }
  assert.match(policy, /Bangladesh only/);
  assert.match(policy, /English is the release-one operational interface/);
  assert.match(policy, /does not claim to translate the complete application/);
  assert.match(policy, /BDT only/);
  assert.match(policy, /Firebase anonymous identity/);
  assert.match(policy, /Firebase Email\/Password, Google and Anonymous guest identity/);
  assert.match(policy, /Phone OTP and additional social providers are not advertised/);
  assert.match(policy, /Cash on Delivery and SSLCommerz hosted checkout only/);
  assert.match(policy, /Direct\/manual bKash, Nagad and payment-proof checkout are disabled/);
  assert.match(policy, /one parent order and one vendor order/);
  assert.match(policy, /product, shop, vendor plus category, vendor, category, global fallback/);
  assert.match(policy, /does not expose rider or pickup-staff names/);
  assert.match(policy, /collected once against the parent-order payment/);
  assert.match(policy, /Bangladesh hierarchy: division, district, upazila, then union/);
  assert.match(policy, /Union remains optional/);
  assert.match(policy, /Document validity\/expiry is manually checked/);
  assert.match(policy, /Customer requests cannot claim the administrative reason/);
  assert.match(policy, /Eligible release-one returns have zero restocking fee/);
});

test("deployment targets are selected without claiming external provisioning", async () => {
  const targets = await readFile(new URL("../docs/deployment-targets.md", import.meta.url), "utf8");
  for (const provider of ["Render Web Service", "Render Background Worker", "Neon PostgreSQL", "Render Key Value", "Expo EAS", "Firebase Auth", "Sentry", "GitHub Container Registry"]) assert.match(targets, new RegExp(provider));
  assert.match(targets, /does not prove that an external account/);
  assert.match(targets, /staging smoke reports/);
  assert.match(targets, /Redis must use `rediss:\/\/`/);
});

test("retention policy preserves regulated records until approved", async () => {
  const [policy, approval] = await Promise.all([
    readFile(new URL("../docs/data-retention-policy.md", import.meta.url), "utf8"),
    readFile(new URL("../docs/data-retention-approval-template.md", import.meta.url), "utf8")
  ]);
  assert.match(policy, /not legal advice/);
  assert.match(policy, /Seven years after financial completion/);
  assert.match(policy, /Two years after thread closure/);
  assert.match(policy, /holds override every expiry date/);
  assert.match(policy, /No automated job deletes commerce, finance, KYC, evidence, support, audit or provider-callback records/);
  for (const approver of ["Privacy/legal approver", "Finance approver", "Operations approver", "Security approver"]) assert.match(approval, new RegExp(approver));
});

test("restore drill is manual, isolated and retains immutable evidence", async () => {
  const workflow = await readFile(new URL("../.github/workflows/restore-drill.yml", import.meta.url), "utf8");
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /environment: recovery-drill/);
  assert.match(workflow, /RESTORE_VERIFICATION_ACK: isolated-non-production/);
  assert.match(workflow, /RESTORE_DATABASE_URL: \$\{\{ secrets\.RESTORE_DATABASE_URL \}\}/);
  assert.match(workflow, /DATABASE_URL: \$\{\{ secrets\.ACTIVE_DATABASE_URL \}\}/);
  assert.match(workflow, /npm run restore:verify/);
  assert.match(workflow, /retention-days: 90/);
  assert.doesNotMatch(workflow, /prisma:migrate:deploy/);
  assert.doesNotMatch(workflow, /uses:\s+[^\s]+@v\d+/);
});
