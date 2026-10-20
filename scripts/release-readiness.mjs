import { access, readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const requiredFiles = [
  ".github/workflows/ci.yml",
  ".github/workflows/deploy.yml",
  "apps/api/Dockerfile",
  "apps/worker/Dockerfile",
  "apps/mobile/eas.json",
  "apps/mobile/assets/amiyo-icon.png",
  "apps/mobile/assets/amiyo-adaptive-foreground.png",
  "docs/runbooks/backup-restore.md",
  "docs/runbooks/incident-response.md",
  "docs/runbooks/release.md",
  "docs/runbooks/queue-operations.md",
  "docs/runbooks/payment-operations.md",
  "docs/runbooks/delivery-operations.md",
  "docs/handover.md",
  "docs/environment-reference.md",
  "docs/test-strategy-and-evidence.md",
  "docs/store-release-guide.md",
  "docs/known-limitations.md"
];

await Promise.all(requiredFiles.map((file) => access(new URL(`../${file}`, import.meta.url))));
const decisions = await readFile(new URL("../docs/decisions-needed.md", import.meta.url), "utf8");
const blockers = decisions.split("\n").filter((line) => /^\|.*\| (TBD|PARTIAL|BLOCKED) \|/.test(line));
const root = fileURLToPath(new URL("..", import.meta.url));
const npmCli = process.env.npm_execpath;
const audit = npmCli
  ? spawnSync(process.execPath, [npmCli, "audit", "--omit=dev", "--json"], { cwd: root, encoding: "utf8", maxBuffer: 10 * 1024 * 1024 })
  : spawnSync("npm", ["audit", "--omit=dev", "--json"], { cwd: root, encoding: "utf8", maxBuffer: 10 * 1024 * 1024, shell: process.platform === "win32" });
let dependencyAudit = { status: "unavailable", critical: 0, high: 0, moderate: 0, low: 0, total: 0 };
try {
  const report = JSON.parse(audit.stdout);
  const vulnerabilities = report.metadata?.vulnerabilities ?? {};
  dependencyAudit = {
    status: Number(vulnerabilities.critical || 0) + Number(vulnerabilities.high || 0) === 0 ? "passed" : "blocked",
    critical: Number(vulnerabilities.critical || 0),
    high: Number(vulnerabilities.high || 0),
    moderate: Number(vulnerabilities.moderate || 0),
    low: Number(vulnerabilities.low || 0),
    total: Number(vulnerabilities.total || 0)
  };
} catch {}
const releaseBlocked = blockers.length > 0 || dependencyAudit.status !== "passed";
const result = { status: releaseBlocked ? "blocked" : "ready", unresolvedDecisions: blockers.length, checkedFiles: requiredFiles.length, dependencyAudit };
console.log(JSON.stringify(result, null, 2));
if (process.env.REQUIRE_PRODUCTION_READY === "true" && releaseBlocked) process.exitCode = 1;
