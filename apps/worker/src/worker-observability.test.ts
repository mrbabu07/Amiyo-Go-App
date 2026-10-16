import assert from "node:assert/strict";
import test from "node:test";
import { EventEmitter } from "node:events";
import type { Worker } from "bullmq";
import { bindWorkerObservability } from "./worker-observability.js";

function fixture() {
  const records: Array<{ level: string; values: Record<string, unknown>; message: string }> = [];
  const logger = {
    info: (values: Record<string, unknown>, message: string) => records.push({ level: "info", values, message }),
    warn: (values: Record<string, unknown>, message: string) => records.push({ level: "warn", values, message }),
    error: (values: Record<string, unknown>, message: string) => records.push({ level: "error", values, message })
  };
  const worker = new EventEmitter() as unknown as Worker;
  bindWorkerObservability(worker, "notifications", logger, { slowJobMs: 100, now: () => 250 });
  return { worker, records };
}

test("worker observability records completed and slow jobs without payload data", () => {
  const { worker, records } = fixture();
  worker.emit("completed", { id: "job-1", name: "push", attemptsMade: 1, processedOn: 100, finishedOn: 150 } as never, undefined, "active");
  worker.emit("completed", { id: "job-2", name: "email", attemptsMade: 2, processedOn: 100, finishedOn: 220 } as never, undefined, "active");
  assert.equal(records[0]?.level, "info");
  assert.equal(records[1]?.level, "warn");
  assert.equal(records[1]?.values.durationMs, 120);
  assert.equal("data" in (records[1]?.values ?? {}), false);
});

test("worker observability records bounded failure and stalled evidence", () => {
  const { worker, records } = fixture();
  worker.emit("failed", { id: "job-3", name: "push", attemptsMade: 3, processedOn: 200 } as never, new Error("provider unavailable"), "active");
  worker.emit("stalled", "job-4", "active");
  assert.equal(records[0]?.level, "error");
  assert.equal(records[0]?.values.error, "provider unavailable");
  assert.deepEqual(records[1], { level: "warn", message: "Worker job stalled", values: { queueName: "notifications", jobId: "job-4" } });
});
