import assert from "node:assert/strict";
import test from "node:test";
import { QueueMetricsScheduler, workerQueueMetrics } from "./queue-metrics.js";

test("queue metrics expose bounded counts without job payloads", async () => {
  const requested: string[][] = [];
  const metrics = await workerQueueMetrics([{ name: 'delivery-"dispatch', queue: { getJobCounts: async (...states: string[]) => { requested.push(states); return { waiting: 2, active: 1, failed: 3 }; } } as never }]);
  assert.deepEqual(requested[0], ["waiting", "active", "delayed", "failed", "completed", "paused"]);
  assert.match(metrics, /queue="delivery-\\"dispatch",state="waiting"} 2/);
  assert.match(metrics, /state="failed"} 3/);
  assert.match(metrics, /state="completed"} 0/);
  assert.doesNotMatch(metrics, /payload|data|token|secret/i);
});

test("queue metrics scheduler emits structured aggregate counts", async () => {
  const records: Array<{ values: Record<string, unknown>; message: string }> = [];
  const scheduler = new QueueMetricsScheduler([{ name: "delivery", queue: { getJobCounts: async () => ({ waiting: 4, failed: 1 }) } as never }], {
    info: (values, message) => records.push({ values, message }),
    error: () => assert.fail("unexpected metrics failure")
  });
  await scheduler.poll();
  assert.deepEqual(records, [{ message: "Worker queue metrics", values: { queueName: "delivery", counts: { waiting: 4, active: 0, delayed: 0, failed: 1, completed: 0, paused: 0 } } }]);
  assert.doesNotMatch(JSON.stringify(records), /payload|token|secret/i);
});

test("overlapping queue metric polls do not duplicate samples", async () => {
  let queries = 0;
  let release: () => void = () => undefined;
  const pending = new Promise<void>((resolve) => { release = resolve; });
  const scheduler = new QueueMetricsScheduler([{ name: "delivery", queue: { getJobCounts: async () => { queries++; await pending; return {}; } } as never }], { info: () => undefined, error: () => assert.fail("unexpected metrics failure") });
  const first = scheduler.poll();
  await Promise.resolve();
  await scheduler.poll();
  release();
  await first;
  assert.equal(queries, 1);
});
