import { access, readFile } from "node:fs/promises";

const requiredFiles = [
  ".github/workflows/ci.yml",
  ".github/workflows/deploy.yml",
  "apps/api/Dockerfile",
  "apps/worker/Dockerfile",
  "apps/mobile/eas.json",
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
const blockers = decisions.split("\n").filter((line) => /^\|.*\| (TBD|BLOCKED) \|/.test(line));
const result = { status: blockers.length === 0 ? "ready" : "blocked", unresolvedDecisions: blockers.length, checkedFiles: requiredFiles.length };
console.log(JSON.stringify(result, null, 2));
if (process.env.REQUIRE_PRODUCTION_READY === "true" && blockers.length > 0) process.exitCode = 1;
