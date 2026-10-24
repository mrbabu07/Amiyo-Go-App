import assert from "node:assert/strict";
import test from "node:test";
import { createWorkerHealthServer, closeWorkerHealthServer } from "./health-server.js";

async function fixture(readiness: () => Promise<void>, isShuttingDown = () => false, metrics?: () => Promise<string>) {
  const warnings: unknown[] = [];
  const server = createWorkerHealthServer({ readiness, isShuttingDown, ...(metrics ? { metrics } : {}), logger: { info: () => undefined, warn: (values) => warnings.push(values) } });
  server.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Test server address unavailable");
  return { server, origin: `http://127.0.0.1:${address.port}`, warnings };
}

test("worker liveness stays available while dependency readiness degrades", async () => {
  const context = await fixture(async () => { throw new Error("redis unavailable"); });
  try {
    assert.equal((await fetch(`${context.origin}/health`)).status, 200);
    assert.equal((await fetch(`${context.origin}/ready`)).status, 503);
    assert.equal(context.warnings.length, 1);
  } finally { await closeWorkerHealthServer(context.server); }
});

test("worker metrics use Prometheus text and fail closed", async () => {
  const context = await fixture(async () => undefined, () => false, async () => "amiyo_worker_queue_jobs{queue=\"delivery\",state=\"failed\"} 1\n");
  try {
    const response = await fetch(`${context.origin}/metrics`);
    assert.equal(response.status, 200);
    assert.match(response.headers.get("content-type") ?? "", /text\/plain/);
    assert.match(await response.text(), /queue_jobs/);
  } finally { await closeWorkerHealthServer(context.server); }
  const failed = await fixture(async () => undefined, () => false, async () => { throw new Error("redis unavailable"); });
  try { assert.equal((await fetch(`${failed.origin}/metrics`)).status, 503); assert.equal(failed.warnings.length, 1); }
  finally { await closeWorkerHealthServer(failed.server); }
});

test("worker readiness succeeds only before shutdown", async () => {
  let shuttingDown = false;
  const context = await fixture(async () => undefined, () => shuttingDown);
  try {
    assert.equal((await fetch(`${context.origin}/ready`)).status, 200);
    shuttingDown = true;
    assert.equal((await fetch(`${context.origin}/ready`)).status, 503);
  } finally { await closeWorkerHealthServer(context.server); }
});
