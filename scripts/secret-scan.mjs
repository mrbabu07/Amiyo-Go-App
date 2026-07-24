import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const ignored = new Set(["node_modules", ".git", "dist", "build", "coverage", ".expo"]);
const patterns = [
  new RegExp("postgresql:\\/\\/[^:\\s]+:[^@\\s]+@", "i"),
  new RegExp("mongodb(?:\\+srv)?:\\/\\/[^:\\s]+:[^@\\s]+@", "i"),
  new RegExp("-{5}BEGIN PRIVATE KEY-{5}", "i"),
  new RegExp("\\bnpg_[A-Za-z0-9]{8,}\\b")
];

const findings = [];

function walk(directory) {
  for (const entry of readdirSync(directory)) {
    if (ignored.has(entry)) continue;
    const path = join(directory, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) {
      walk(path);
      continue;
    }
    if (stat.size > 1024 * 1024) continue;
    const text = readFileSync(path, "utf8");
    patterns.forEach((pattern) => {
      if (pattern.test(text) && !path.endsWith(".env.example")) findings.push(path);
    });
  }
}

walk(root);

if (findings.length > 0) {
  console.error("Potential secrets detected:");
  findings.forEach((path) => console.error(`- ${path}`));
  process.exit(1);
}

console.log("Secret scan passed.");
