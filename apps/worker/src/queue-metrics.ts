import type { Queue } from "bullmq";

const states = ["waiting", "active", "delayed", "failed", "completed", "paused"] as const;

function label(value: string) { return value.replaceAll("\\", "\\\\").replaceAll('"', '\\"').replaceAll("\n", "\\n"); }

export async function workerQueueMetrics(queues: Array<{ name: string; queue: Pick<Queue, "getJobCounts"> }>) {
  const lines = [
    "# HELP amiyo_worker_queue_jobs BullMQ jobs by queue and state.",
    "# TYPE amiyo_worker_queue_jobs gauge"
  ];
  for (const entry of queues) {
    const counts = await entry.queue.getJobCounts(...states);
    for (const state of states) lines.push(`amiyo_worker_queue_jobs{queue="${label(entry.name)}",state="${state}"} ${counts[state] ?? 0}`);
  }
  lines.push("");
  return lines.join("\n");
}
