import { access, readFile, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

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
  "docs/known-limitations.md"
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
const audit = npmCli
  ? spawnSync(process.execPath, [npmCli, "audit", "--omit=dev", "--json"], { cwd: root, encoding: "utf8", maxBuffer: 10 * 1024 * 1024 })
  : spawnSync("npm", ["audit", "--omit=dev", "--json"], { cwd: root, encoding: "utf8", maxBuffer: 10 * 1024 * 1024, shell: process.platform === "win32" });
let dependencyAudit = { status: "unavailable", critical: 0, high: 0, moderate: 0, low: 0, total: 0, blockingPackages: [] };
try {
  const report = JSON.parse(audit.stdout);
  const vulnerabilities = report.metadata?.vulnerabilities ?? {};
  const blockingPackages = Object.values(report.vulnerabilities ?? {})
    .filter((finding) => finding.severity === "critical" || finding.severity === "high")
    .map((finding) => finding.name)
    .sort();
  dependencyAudit = {
    status: Number(vulnerabilities.critical || 0) + Number(vulnerabilities.high || 0) === 0 ? "passed" : "blocked",
    critical: Number(vulnerabilities.critical || 0),
    high: Number(vulnerabilities.high || 0),
    moderate: Number(vulnerabilities.moderate || 0),
    low: Number(vulnerabilities.low || 0),
    total: Number(vulnerabilities.total || 0),
    blockingPackages
  };
} catch {}
const releaseBlocked = blockers.length > 0 || dependencyAudit.status !== "passed";
const provenance = {
  commitSha: boundedMetadata(process.env.RELEASE_COMMIT_SHA, "RELEASE_COMMIT_SHA", /^[0-9a-f]{40}$/i),
  environment: boundedMetadata(process.env.RELEASE_ENVIRONMENT, "RELEASE_ENVIRONMENT", /^(staging|production)$/),
  runId: boundedMetadata(process.env.RELEASE_RUN_ID, "RELEASE_RUN_ID", /^[0-9]+$/)
};
const result = {
  schemaVersion: 1,
  measuredAt: new Date().toISOString(),
  provenance,
  status: releaseBlocked ? "blocked" : "ready",
  unresolvedDecisions: blockers.length,
  unresolvedDecisionNames: blockers,
  checkedFiles: requiredFiles.length,
  dependencyAudit
};
console.log(JSON.stringify(result, null, 2));
if (process.env.RELEASE_REPORT_PATH?.trim()) {
  await writeFile(process.env.RELEASE_REPORT_PATH.trim(), `${JSON.stringify(result, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
}
if (process.env.REQUIRE_PRODUCTION_READY === "true" && releaseBlocked) process.exitCode = 1;
