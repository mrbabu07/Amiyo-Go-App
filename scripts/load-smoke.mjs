const target = process.env.LOAD_TARGET_URL;
const requests = Number(process.env.LOAD_REQUESTS || 100);
const concurrency = Number(process.env.LOAD_CONCURRENCY || 10);

if (!target) throw new Error("LOAD_TARGET_URL is required");
if (!Number.isInteger(requests) || requests < 1) throw new Error("LOAD_REQUESTS must be a positive integer");
if (!Number.isInteger(concurrency) || concurrency < 1) throw new Error("LOAD_CONCURRENCY must be a positive integer");

const durations = [];
let failures = 0;
let cursor = 0;

async function runWorker() {
  while (cursor < requests) {
    cursor += 1;
    const startedAt = performance.now();
    try {
      const response = await fetch(target, { signal: AbortSignal.timeout(10_000) });
      if (!response.ok) failures += 1;
      await response.arrayBuffer();
    } catch {
      failures += 1;
    }
    durations.push(performance.now() - startedAt);
  }
}

await Promise.all(Array.from({ length: Math.min(concurrency, requests) }, () => runWorker()));
durations.sort((left, right) => left - right);
const percentile = (value) => durations[Math.min(durations.length - 1, Math.ceil(durations.length * value) - 1)];
const result = { target, requests, concurrency, failures, p50Ms: Math.round(percentile(0.5)), p95Ms: Math.round(percentile(0.95)), maxMs: Math.round(durations.at(-1) || 0) };
console.log(JSON.stringify(result, null, 2));
if (failures > 0) process.exitCode = 1;
