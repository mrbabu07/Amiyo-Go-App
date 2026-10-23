import assert from "node:assert/strict";
import { copyFile, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

test("secret scan rejects marketplace and infrastructure credentials", async () => {
  for (const secret of [
    "store_" + "passwd: abcdef1234567890",
    "gh" + "p_abcdefghijklmnopqrstuvwxyz123456",
    "AK" + "IA1234567890ABCDEF"
  ]) {
    const directory = await repository();
    await writeFile(join(directory, "leak.txt"), secret);
    const result = run(directory);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /leak\.txt/);
    assert.equal(result.stderr.includes(secret), false);
  }
});

test("secret scan reports a leaking path once and permits templates", async () => {
  const directory = await repository();
  await writeFile(join(directory, "leak.txt"), "store_" + "passwd=abcdef1234567890\nAK" + "IA1234567890ABCDEF");
  await writeFile(join(directory, ".env.example"), "store_" + "passwd=replace-me-before-deploy");
  const result = run(directory);
  assert.equal(result.status, 1);
  assert.equal(result.stderr.match(/leak\.txt/g)?.length, 1);
  assert.equal(result.stderr.includes(".env.example"), false);
});

async function repository() {
  const directory = await mkdtemp(join(tmpdir(), "amiyo-secret-scan-"));
  await copyFile(new URL("./secret-scan.mjs", import.meta.url), join(directory, "secret-scan.mjs"));
  const initialized = spawnSync("git", ["init", "--quiet"], { cwd: directory, encoding: "utf8" });
  assert.equal(initialized.status, 0, initialized.stderr);
  return directory;
}

function run(directory) {
  return spawnSync(process.execPath, ["secret-scan.mjs"], { cwd: directory, encoding: "utf8" });
}
