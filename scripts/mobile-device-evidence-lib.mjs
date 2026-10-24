import assert from "node:assert/strict";

export const requiredMobileFlows = ["customer", "vendor", "admin", "camera-denial", "signed-document", "offline-reconnect"];

export const parseMobileDeviceEvidence = (source) => JSON.parse(source.replace(/^\uFEFF/, ""));

const bounded = (value, name, pattern, maximum = 200) => {
  assert.equal(typeof value, "string", `${name} is required`);
  const normalized = value.trim();
  assert.ok(normalized.length > 0 && normalized.length <= maximum && !/[\r\n]/.test(normalized) && pattern.test(normalized), `${name} is invalid`);
  return normalized;
};

const instant = (value, name) => {
  const normalized = bounded(value, name, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/);
  const milliseconds = Date.parse(normalized);
  assert.ok(Number.isFinite(milliseconds), `${name} is invalid`);
  return { normalized, milliseconds };
};

const exactKeys = (value, name, allowed) => {
  assert.deepEqual(Object.keys(value).sort(), [...allowed].sort(), `${name} contains missing or unsupported fields`);
};

export function validateMobileDeviceEvidence(report, { expectedCommitSha, now = Date.now() } = {}) {
  assert.ok(report && typeof report === "object" && !Array.isArray(report), "Evidence must be an object");
  exactKeys(report, "Evidence", ["schemaVersion", "environment", "commitSha", "apiRelease", "tester", "startedAt", "finishedAt", "app", "device", "flows"]);
  assert.equal(report.schemaVersion, 1, "schemaVersion must be 1");
  assert.equal(report.environment, "staging", "Only staging device evidence is accepted");
  const commitSha = bounded(report.commitSha, "commitSha", /^[0-9a-f]{40}$/i);
  if (expectedCommitSha) assert.equal(commitSha.toLowerCase(), bounded(expectedCommitSha, "expectedCommitSha", /^[0-9a-f]{40}$/i).toLowerCase(), "Evidence commit does not match the release commit");
  const apiRelease = bounded(report.apiRelease, "apiRelease", /^[0-9a-f]{40}$/i);
  const tester = bounded(report.tester, "tester", /^[a-zA-Z0-9._ -]+$/, 80);
  const startedAt = instant(report.startedAt, "startedAt");
  const finishedAt = instant(report.finishedAt, "finishedAt");
  assert.ok(finishedAt.milliseconds >= startedAt.milliseconds, "finishedAt must not precede startedAt");
  assert.ok(finishedAt.milliseconds - startedAt.milliseconds <= 4 * 60 * 60 * 1000, "Device run cannot exceed four hours");
  assert.ok(finishedAt.milliseconds <= now + 5 * 60 * 1000, "Device evidence cannot be future dated");
  assert.ok(now - finishedAt.milliseconds <= 14 * 24 * 60 * 60 * 1000, "Device evidence is older than fourteen days");

  assert.ok(report.app && typeof report.app === "object", "app metadata is required");
  exactKeys(report.app, "app", ["platform", "packageId", "buildId"]);
  assert.equal(report.app.platform, "android", "This evidence profile requires Android");
  assert.equal(report.app.packageId, "com.amiyo.go", "Unexpected application package");
  const buildId = bounded(report.app.buildId, "app.buildId", /^[a-zA-Z0-9._+-]+$/, 120);

  assert.ok(report.device && typeof report.device === "object", "device metadata is required");
  exactKeys(report.device, "device", ["kind", "model", "osVersion"]);
  assert.ok(["physical", "emulator"].includes(report.device.kind), "device.kind must be physical or emulator");
  const deviceModel = bounded(report.device.model, "device.model", /^[a-zA-Z0-9()_.,+ -]+$/, 120);
  const osVersion = bounded(report.device.osVersion, "device.osVersion", /^[a-zA-Z0-9._ -]+$/, 80);

  assert.ok(Array.isArray(report.flows), "flows must be an array");
  const flowNames = report.flows.map((flow) => flow?.name);
  assert.equal(new Set(flowNames).size, flowNames.length, "Flow evidence names must be unique");
  assert.deepEqual([...flowNames].sort(), [...requiredMobileFlows].sort(), "Every required mobile flow must have evidence");
  const flows = report.flows.map((flow) => {
    assert.ok(flow && typeof flow === "object" && !Array.isArray(flow), "Each flow must be an object");
    exactKeys(flow, `${flow.name ?? "unknown"} flow`, ["name", "status", "durationSeconds", "screenshotCount"]);
    assert.equal(flow.status, "passed", `${flow.name} did not pass`);
    assert.ok(Number.isInteger(flow.durationSeconds) && flow.durationSeconds > 0 && flow.durationSeconds <= 1800, `${flow.name}.durationSeconds is invalid`);
    assert.ok(Number.isInteger(flow.screenshotCount) && flow.screenshotCount >= 1 && flow.screenshotCount <= 100, `${flow.name}.screenshotCount is invalid`);
    return { name: flow.name, status: flow.status, durationSeconds: flow.durationSeconds, screenshotCount: flow.screenshotCount };
  });

  return {
    schemaVersion: 1,
    environment: "staging",
    commitSha,
    apiRelease,
    tester,
    startedAt: startedAt.normalized,
    finishedAt: finishedAt.normalized,
    app: { platform: report.app.platform, packageId: report.app.packageId, buildId },
    device: { kind: report.device.kind, model: deviceModel, osVersion },
    flows
  };
}
