import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Neon-backed checkout allows enough time for atomic order creation", async () => {
  const source = await readFile(new URL("../apps/api/src/infrastructure/database/transaction.ts", import.meta.url), "utf8");
  assert.match(source, /maxWait: 10_000/);
  assert.match(source, /timeout: 60_000/);
});

test("development launcher clears stale Metro module state", async () => {
  const source = JSON.parse(await readFile(new URL("../apps/mobile/package.json", import.meta.url), "utf8"));
  assert.equal(source.scripts.start, "expo start --clear");
});

test("development launcher reuses healthy API and Expo servers", async () => {
  const source = await readFile(new URL("dev.mjs", import.meta.url), "utf8");
  assert.match(source, /127\.0\.0\.1:4000\/health/);
  assert.match(source, /127\.0\.0\.1:8081/);
  assert.match(source, /Reusing the Amiyo API/);
  assert.match(source, /Reusing the Expo web server/);
  assert.match(source, /name !== "mobile" \|\| !mobileRunning/);
});
