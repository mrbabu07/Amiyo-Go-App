import assert from "node:assert/strict";
import test from "node:test";
import { workerQueueMetrics } from "./queue-metrics.js";

test("queue metrics expose bounded counts without job payloads", async () => {
  const requested: string[][] = [];
  const metrics = await workerQueueMetrics([{ name: 'delivery-"dispatch', queue: { getJobCounts: async (...states: string[]) => { requested.push(states); return { waiting: 2, active: 1, failed: 3 }; } } as never }]);
  assert.deepEqual(requested[0], ["waiting", "active", "delayed", "failed", "completed", "paused"]);
  assert.match(metrics, /queue="delivery-\\"dispatch",state="waiting"} 2/);
  assert.match(metrics, /state="failed"} 3/);
  assert.match(metrics, /state="completed"} 0/);
  assert.doesNotMatch(metrics, /payload|data|token|secret/i);
});
