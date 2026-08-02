import { execFileSync } from "node:child_process";
import { readFileSync, statSync } from "node:fs";

const root = process.cwd();
const patterns = [
  new RegExp("postgresql:\\/\\/[^:\\s]+:[^@\\s]+@", "i"),
  new RegExp("mongodb(?:\\+srv)?:\\/\\/[^:\\s]+:[^@\\s]+@", "i"),
  new RegExp("-{5}BEGIN PRIVATE KEY-{5}", "i"),
  new RegExp("\\bnpg_[A-Za-z0-9]{8,}\\b")
];

const findings = [];

function scanRepositoryFiles() {
  const paths = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard", "-z"], { cwd: root, encoding: "utf8" }).split("\0").filter(Boolean);
  for (const path of paths) {
    const stat = statSync(path);
    if (stat.size > 1024 * 1024) continue;
    const text = readFileSync(path, "utf8");
    patterns.forEach((pattern) => {
      if (pattern.test(text) && !path.endsWith(".env.example")) findings.push(path);
    });
  }
}

scanRepositoryFiles();

if (findings.length > 0) {
  console.error("Potential secrets detected:");
  findings.forEach((path) => console.error(`- ${path}`));
  process.exit(1);
}

console.log("Secret scan passed.");
