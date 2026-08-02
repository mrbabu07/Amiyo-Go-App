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
  assert.match(apiDockerfile, /USER node/);
  assert.match(workerDockerfile, /USER node/);
  assert.match(workflow, /npm audit --audit-level=high/);
  assert.match(workflow, /docker build/);
});

test("mobile release uses the hardened Expo SDK and explicit build profiles", async () => {
  const mobilePackage = JSON.parse(await readFile(new URL("../apps/mobile/package.json", import.meta.url), "utf8"));
  const eas = JSON.parse(await readFile(new URL("../apps/mobile/eas.json", import.meta.url), "utf8"));
  assert.match(mobilePackage.dependencies.expo, /57/);
  assert.ok(eas.build.preview);
  assert.ok(eas.build.production);
});

test("production gate remains blocked until external evidence exists", async () => {
  const phase = await readFile(new URL("../docs/phase-10-production-hardening.md", import.meta.url), "utf8");
  assert.match(phase, /Gate status: blocked/);
  assert.match(phase, /not production-ready/);
});
