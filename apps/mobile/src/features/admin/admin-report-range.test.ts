import assert from "node:assert/strict";
import test from "node:test";
import { buildCustomAdminRange } from "./admin-report-range";

test("custom admin range covers complete Dhaka calendar dates", () => {
  const range = buildCustomAdminRange("2026-08-01", "2026-08-31");
  assert.equal(range.range, "custom");
  assert.equal(range.startsAt?.toISOString(), "2026-07-31T18:00:00.000Z");
  assert.equal(range.endsAt?.toISOString(), "2026-08-31T17:59:59.999Z");
});

test("custom admin range rejects missing, reversed and oversized dates", () => {
  assert.throws(() => buildCustomAdminRange("", "2026-08-31"), /valid start/);
  assert.throws(() => buildCustomAdminRange("2026-09-01", "2026-08-31"), /valid start/);
  assert.throws(() => buildCustomAdminRange("2024-01-01", "2026-01-01"), /at most 366/);
});
