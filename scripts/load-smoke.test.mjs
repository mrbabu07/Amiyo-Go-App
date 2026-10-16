import assert from "node:assert/strict";
import test from "node:test";
import { loadSmokeConfiguration, runLoadSmoke } from "./load-smoke-lib.mjs";

test("load smoke configuration rejects credential-bearing and invalid thresholds", () => {
  assert.throws(() => loadSmokeConfiguration({ LOAD_TARGET_URL: "https://user:pass@example.test/health" }), /without credentials/);
  assert.throws(() => loadSmokeConfiguration({ LOAD_TARGET_URL: "https://example.test/health", LOAD_MAX_FAILURE_RATE: "2" }), /between 0 and 1/);
});

test("load smoke reports bounded latency, throughput and status counts", async () => {
  let time = 0;
  const result = await runLoadSmoke(loadSmokeConfiguration({ LOAD_TARGET_URL: "https://example.test/products?token=secret", LOAD_REQUESTS: "4", LOAD_CONCURRENCY: "1", LOAD_WARMUP_REQUESTS: "1", LOAD_MAX_P95_MS: "20" }), {
    now: () => time,
    fetch: async () => { time += 5; return { ok: true, status: 200, arrayBuffer: async () => new ArrayBuffer(0) }; }
  });
  assert.equal(result.passed, true);
  assert.equal(result.target, "https://example.test/products");
  assert.deepEqual(result.statusCounts, { "200": 4 });
  assert.equal(result.latencyMs.p95, 5);
  assert.ok(result.throughputRps > 0);
});

test("load smoke fails when error budget or latency threshold is exceeded", async () => {
  let time = 0;
  let call = 0;
  const configuration = loadSmokeConfiguration({ LOAD_TARGET_URL: "https://example.test/ready", LOAD_REQUESTS: "2", LOAD_CONCURRENCY: "1", LOAD_WARMUP_REQUESTS: "0", LOAD_MAX_FAILURE_RATE: "0", LOAD_MAX_P95_MS: "5" });
  const result = await runLoadSmoke(configuration, {
    now: () => time,
    fetch: async () => { call += 1; time += 10; return { ok: call !== 2, status: call === 2 ? 503 : 200, arrayBuffer: async () => new ArrayBuffer(0) }; }
  });
  assert.equal(result.passed, false);
  assert.deepEqual(result.statusCounts, { "200": 1, "503": 1 });
  assert.equal(result.failures, 1);
  assert.equal(result.violations.length, 2);
});
