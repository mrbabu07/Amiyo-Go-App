import assert from "node:assert/strict";
import test from "node:test";
import { returnEligibilityMessage } from "./return-eligibility";

test("return controls expire at the exact deadline without waiting for a refetch", () => {
  const deadline = "2026-10-03T12:00:00.000Z";
  const eligibility = { deadline, reason: "AVAILABLE" as const, requireEvidence: true };
  assert.equal(returnEligibilityMessage(eligibility, Date.parse(deadline) - 1), null);
  assert.match(returnEligibilityMessage(eligibility, Date.parse(deadline))!, /window has ended/);
});

test("missing policy, delivery dates and exhausted packages fail closed", () => {
  assert.match(returnEligibilityMessage(undefined, 0)!, /Refresh/);
  for (const reason of ["NO_ITEMS", "NOT_DELIVERED", "DELIVERY_UNVERIFIED", "POLICY_UNAVAILABLE", "EXPIRED", "AVAILABLE"] as const) {
    assert.ok(returnEligibilityMessage({ deadline: null, reason, requireEvidence: null }, 0));
  }
});
