const integer = (value, fallback, name, minimum = 1) => {
  const parsed = Number(value ?? fallback);
  if (!Number.isInteger(parsed) || parsed < minimum) throw new Error(`${name} must be an integer of at least ${minimum}`);
  return parsed;
};

const decimal = (value, fallback, name, minimum, maximum) => {
  const parsed = Number(value ?? fallback);
  if (!Number.isFinite(parsed) || parsed < minimum || parsed > maximum) throw new Error(`${name} must be between ${minimum} and ${maximum}`);
  return parsed;
};

export function loadSmokeConfiguration(environment) {
  if (!environment.LOAD_TARGET_URL) throw new Error("LOAD_TARGET_URL is required");
  const target = new URL(environment.LOAD_TARGET_URL);
  if (!["http:", "https:"].includes(target.protocol) || target.username || target.password) throw new Error("LOAD_TARGET_URL must be an HTTP(S) URL without credentials");
  const bearerToken = environment.LOAD_BEARER_TOKEN?.trim() || null;
  if (bearerToken && (bearerToken.length > 16_384 || /[\r\n]/.test(bearerToken))) throw new Error("LOAD_BEARER_TOKEN must be a single bounded token");
  return {
    target,
    bearerToken,
    requests: integer(environment.LOAD_REQUESTS, 100, "LOAD_REQUESTS"),
    concurrency: integer(environment.LOAD_CONCURRENCY, 10, "LOAD_CONCURRENCY"),
    warmupRequests: integer(environment.LOAD_WARMUP_REQUESTS, 5, "LOAD_WARMUP_REQUESTS", 0),
    timeoutMs: integer(environment.LOAD_TIMEOUT_MS, 10_000, "LOAD_TIMEOUT_MS"),
    maxP95Ms: integer(environment.LOAD_MAX_P95_MS, 1_500, "LOAD_MAX_P95_MS"),
    maxFailureRate: decimal(environment.LOAD_MAX_FAILURE_RATE, 0, "LOAD_MAX_FAILURE_RATE", 0, 1),
    reportPath: environment.LOAD_REPORT_PATH?.trim() || null
  };
}

const percentile = (durations, fraction) => durations[Math.min(durations.length - 1, Math.ceil(durations.length * fraction) - 1)] ?? 0;
const publicTarget = (target) => `${target.origin}${target.pathname}`;

export async function runLoadSmoke(configuration, dependencies = {}) {
  const request = dependencies.fetch ?? fetch;
  const clock = dependencies.now ?? (() => performance.now());
  const measured = [];
  const statuses = new Map();
  let failures = 0;
  let cursor = 0;

  const execute = async (record) => {
    const startedAt = clock();
    try {
      const response = await request(configuration.target, { signal: AbortSignal.timeout(configuration.timeoutMs), headers: configuration.bearerToken ? { Authorization: `Bearer ${configuration.bearerToken}` } : undefined });
      await response.arrayBuffer();
      if (record) statuses.set(String(response.status), (statuses.get(String(response.status)) ?? 0) + 1);
      if (!response.ok && record) failures += 1;
    } catch {
      if (record) {
        failures += 1;
        statuses.set("network_error", (statuses.get("network_error") ?? 0) + 1);
      }
    } finally {
      if (record) measured.push(clock() - startedAt);
    }
  };

  for (let count = 0; count < configuration.warmupRequests; count += 1) await execute(false);
  const runStartedAt = clock();
  const worker = async () => {
    while (cursor < configuration.requests) {
      cursor += 1;
      await execute(true);
    }
  };
  await Promise.all(Array.from({ length: Math.min(configuration.concurrency, configuration.requests) }, worker));
  const elapsedMs = Math.max(clock() - runStartedAt, 0.001);
  measured.sort((left, right) => left - right);
  const p95Ms = Math.round(percentile(measured, 0.95));
  const failureRate = failures / configuration.requests;
  const violations = [];
  if (failureRate > configuration.maxFailureRate) violations.push(`failure rate ${(failureRate * 100).toFixed(2)}% exceeds ${(configuration.maxFailureRate * 100).toFixed(2)}%`);
  if (p95Ms > configuration.maxP95Ms) violations.push(`p95 ${p95Ms}ms exceeds ${configuration.maxP95Ms}ms`);

  return {
    schemaVersion: 1,
    measuredAt: new Date().toISOString(),
    target: publicTarget(configuration.target),
    authenticated: Boolean(configuration.bearerToken),
    requests: configuration.requests,
    concurrency: configuration.concurrency,
    warmupRequests: configuration.warmupRequests,
    timeoutMs: configuration.timeoutMs,
    failures,
    failureRate: Number(failureRate.toFixed(4)),
    statusCounts: Object.fromEntries([...statuses.entries()].sort()),
    elapsedMs: Math.round(elapsedMs),
    throughputRps: Number((configuration.requests / (elapsedMs / 1_000)).toFixed(2)),
    latencyMs: {
      p50: Math.round(percentile(measured, 0.5)),
      p95: p95Ms,
      p99: Math.round(percentile(measured, 0.99)),
      max: Math.round(measured.at(-1) ?? 0)
    },
    thresholds: { maxFailureRate: configuration.maxFailureRate, maxP95Ms: configuration.maxP95Ms },
    passed: violations.length === 0,
    violations
  };
}
