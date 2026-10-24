import { access, readFile, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { parseFinanceProviderEvidence, validateFinanceProviderEvidence } from "./finance-provider-evidence-lib.mjs";
import { parseMobileDeviceEvidence, validateMobileDeviceEvidence } from "./mobile-device-evidence-lib.mjs";
import { parseRestoreReleaseEvidence, validateRestoreReleaseEvidence } from "./restore-release-evidence-lib.mjs";
import { parseStagingSmokeEvidence, validateStagingSmokeEvidence } from "./staging-smoke-evidence-lib.mjs";

const requiredFiles = [
  ".github/workflows/ci.yml",
  ".github/workflows/deploy.yml",
  ".github/workflows/staging-smoke.yml",
  ".github/dependabot.yml",
  ".github/CODEOWNERS",
  ".github/pull_request_template.md",
  "SECURITY.md",
  "render.yaml",
  "apps/api/Dockerfile",
  "apps/worker/Dockerfile",
  "apps/mobile/eas.json",
  "apps/mobile/assets/amiyo-icon.png",
  "apps/mobile/assets/amiyo-adaptive-foreground.png",
  "docs/runbooks/backup-restore.md",
  "docs/runbooks/incident-response.md",
  "docs/runbooks/release.md",
  "docs/runbooks/render-deployment.md",
  "docs/runbooks/queue-operations.md",
  "docs/runbooks/payment-operations.md",
  "docs/runbooks/delivery-operations.md",
  "docs/handover.md",
  "docs/environment-reference.md",
  "docs/test-strategy-and-evidence.md",
  "docs/store-release-guide.md",
  "docs/known-limitations.md",
  "docs/release-one-operating-policy.md"
];

const boundedMetadata = (value, name, pattern) => {
  const normalized = value?.trim();
  if (!normalized) return null;
  if (normalized.length > 200 || /[\r\n]/.test(normalized) || !pattern.test(normalized)) throw new Error(`${name} is invalid`);
  return normalized;
};

await Promise.all(requiredFiles.map((file) => access(new URL(`../${file}`, import.meta.url))));
const decisions = await readFile(new URL("../docs/decisions-needed.md", import.meta.url), "utf8");
const blockers = decisions.split("\n").flatMap((line) => {
  if (!/^\|.*\| (TBD|PARTIAL|BLOCKED) \|/.test(line)) return [];
  const [decision, status] = line.split("|").slice(1, 3).map((value) => value.trim());
  return [{ decision, status }];
});
const root = fileURLToPath(new URL("..", import.meta.url));
const npmCli = process.env.npm_execpath;
const unavailableAudit = () => ({ status: "unavailable", critical: 0, high: 0, moderate: 0, low: 0, total: 0, blockingPackages: [] });
const runAudit = (workspace) => {
  const args = ["audit", "--omit=dev", ...(workspace ? ["--workspace", workspace] : []), "--json"];
  const audit = npmCli
    ? spawnSync(process.execPath, [npmCli, ...args], { cwd: root, encoding: "utf8", maxBuffer: 10 * 1024 * 1024 })
    : spawnSync("npm", args, { cwd: root, encoding: "utf8", maxBuffer: 10 * 1024 * 1024, shell: process.platform === "win32" });
  try {
    const report = JSON.parse(audit.stdout);
    const vulnerabilities = report.metadata?.vulnerabilities ?? {};
    const blockingPackages = Object.values(report.vulnerabilities ?? {})
      .filter((finding) => finding.severity === "critical" || finding.severity === "high")
      .map((finding) => finding.name)
      .sort();
    return {
      status: Number(vulnerabilities.critical || 0) + Number(vulnerabilities.high || 0) === 0 ? "passed" : "blocked",
      critical: Number(vulnerabilities.critical || 0),
      high: Number(vulnerabilities.high || 0),
      moderate: Number(vulnerabilities.moderate || 0),
      low: Number(vulnerabilities.low || 0),
      total: Number(vulnerabilities.total || 0),
      blockingPackages
    };
  } catch {
    return unavailableAudit();
  }
};
const dependencyAudit = runAudit();
const runtimeDependencyAudits = {
  api: runAudit("@amiyo/api"),
  worker: runAudit("@amiyo/worker")
};
const provenance = {
  commitSha: boundedMetadata(process.env.RELEASE_COMMIT_SHA, "RELEASE_COMMIT_SHA", /^[0-9a-f]{40}$/i),
  environment: boundedMetadata(process.env.RELEASE_ENVIRONMENT, "RELEASE_ENVIRONMENT", /^(ci|staging|production)$/),
  runId: boundedMetadata(process.env.RELEASE_RUN_ID, "RELEASE_RUN_ID", /^[0-9]+$/)
};
const evidencePath = (value, name) => {
  const normalized = value?.trim();
  if (!normalized) return null;
  if (normalized.length > 2_048 || /[\r\n\0]/.test(normalized)) throw new Error(`${name} is invalid`);
  return normalized;
};
const validateEvidence = async (path, parser, validator, expectedPlatform) => {
  if (!path) return { status: "missing" };
  try {
    const validated = validator(parser(await readFile(path, "utf8")), { expectedCommitSha: provenance.commitSha ?? undefined });
    if (expectedPlatform && validated.app.platform !== expectedPlatform) throw new Error(`Expected ${expectedPlatform} evidence`);
    return { status: "passed", measuredAt: validated.finishedAt ?? validated.executedAt, ...(expectedPlatform ? { platform: expectedPlatform } : {}) };
  } catch (error) {
    return { status: "invalid", reason: error instanceof Error ? error.message : "Evidence validation failed" };
  }
};
const releaseEvidence = {
  android: await validateEvidence(evidencePath(process.env.ANDROID_DEVICE_EVIDENCE_PATH, "ANDROID_DEVICE_EVIDENCE_PATH"), parseMobileDeviceEvidence, validateMobileDeviceEvidence, "android"),
  ios: await validateEvidence(evidencePath(process.env.IOS_DEVICE_EVIDENCE_PATH, "IOS_DEVICE_EVIDENCE_PATH"), parseMobileDeviceEvidence, validateMobileDeviceEvidence, "ios"),
  finance: await validateEvidence(evidencePath(process.env.FINANCE_PROVIDER_EVIDENCE_PATH, "FINANCE_PROVIDER_EVIDENCE_PATH"), parseFinanceProviderEvidence, validateFinanceProviderEvidence),
  restore: await validateEvidence(evidencePath(process.env.RESTORE_RELEASE_EVIDENCE_PATH, "RESTORE_RELEASE_EVIDENCE_PATH"), parseRestoreReleaseEvidence, validateRestoreReleaseEvidence),
  staging: await validateEvidence(evidencePath(process.env.STAGING_SMOKE_EVIDENCE_PATH, "STAGING_SMOKE_EVIDENCE_PATH"), parseStagingSmokeEvidence, validateStagingSmokeEvidence)
};
const evidenceRequired = provenance.environment === "production" || process.env.REQUIRE_PRODUCTION_READY === "true";
const evidenceBlocked = evidenceRequired && Object.values(releaseEvidence).some((evidence) => evidence.status !== "passed");
const releaseBlocked = blockers.length > 0 || dependencyAudit.status !== "passed" || Object.values(runtimeDependencyAudits).some((audit) => audit.status !== "passed") || evidenceBlocked;
const result = {
  schemaVersion: 1,
  measuredAt: new Date().toISOString(),
  provenance,
  status: releaseBlocked ? "blocked" : "ready",
  unresolvedDecisions: blockers.length,
  unresolvedDecisionNames: blockers,
  checkedFiles: requiredFiles.length,
  dependencyAudit,
  runtimeDependencyAudits,
  releaseEvidence: { required: evidenceRequired, ...releaseEvidence }
};
console.log(JSON.stringify(result, null, 2));
if (process.env.RELEASE_REPORT_PATH?.trim()) {
  await writeFile(process.env.RELEASE_REPORT_PATH.trim(), `${JSON.stringify(result, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
}
if (process.env.REQUIRE_PRODUCTION_READY === "true" && releaseBlocked) process.exitCode = 1;
