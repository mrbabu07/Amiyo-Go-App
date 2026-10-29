import { spawnSync } from "node:child_process";
import { readdir } from "node:fs/promises";
import { relative, resolve } from "node:path";

const root = resolve(process.argv[2] ?? "dist");

async function collect(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(entries.map(async (entry) => {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) return collect(path);
    return entry.isFile() && entry.name.endsWith(".test.js") ? [path] : [];
  }));
  return files.flat();
}

const files = (await collect(root)).sort().map((file) => relative(process.cwd(), file));
if (files.length === 0) throw new Error("No compiled test files found under " + root);

const result = spawnSync(process.execPath, ["--test", ...files], {
  cwd: process.cwd(),
  env: process.env,
  stdio: "inherit",
  windowsHide: true
});

if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
