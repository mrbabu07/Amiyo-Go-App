import assert from "node:assert/strict";
import test from "node:test";
import { returnProgress } from "./return-progress";

test("return progress never infers missing milestones from later events", () => {
  const steps = returnProgress([{ id: "refund", fromStatus: "REFUND_PENDING", toStatus: "REFUNDED", createdAt: "2026-10-08T12:00:00Z" }]);
  assert.deepEqual(steps.map((step) => Boolean(step.recordedAt)), [false, false, false, true]);
  for (const events of [undefined, []]) assert.ok(returnProgress(events).every((step) => step.recordedAt === null));
});

test("review rejection and closure do not fabricate refund or pickup completion", () => {
  for (const toStatus of ["APPROVED", "REVIEWING", "REJECTED", "CLOSED", "REFUND_PENDING"] as const) {
    assert.ok(returnProgress([{ id: "event", fromStatus: "REQUESTED", toStatus, createdAt: "2026-10-08T12:00:00Z" }]).every((step) => !step.recordedAt));
  }
});

test("milestone dates use the newest recorded event without mutating the input", () => {
  const events = [
    { id: "new", fromStatus: "APPROVED" as const, toStatus: "PICKUP_SCHEDULED" as const, createdAt: "2026-10-08T12:00:00Z" },
    { id: "old", fromStatus: "APPROVED" as const, toStatus: "PICKUP_SCHEDULED" as const, createdAt: "2026-10-07T12:00:00Z" },
    { id: "invalid", fromStatus: "APPROVED" as const, toStatus: "PICKUP_SCHEDULED" as const, createdAt: "bad-date" }
  ];
  const before = structuredClone(events);
  assert.equal(returnProgress(events)[1]!.recordedAt, events[0]!.createdAt);
  assert.deepEqual(events, before);
});
