import assert from "node:assert/strict";
import test from "node:test";
import type { OrderDto } from "@amiyo/contracts";
import { returnActionState } from "./return-action";

function orderWithReasons(reasons: Array<OrderDto["vendorOrders"][number]["returnEligibility"]>) {
  return { vendorOrders: reasons.map((returnEligibility) => ({ returnEligibility })) } as OrderDto;
}

test("return action appears when at least one seller package is eligible", () => {
  const deadline = new Date(Date.now() + 60_000).toISOString();
  const state = returnActionState(orderWithReasons([
    { deadline: null, requireEvidence: false, reason: "NOT_DELIVERED" },
    { deadline, requireEvidence: true, reason: "AVAILABLE" }
  ]), Date.now());
  assert.deepEqual(state, { available: true, message: null });
});

test("return action explains why all seller packages are unavailable", () => {
  const state = returnActionState(orderWithReasons([
    { deadline: null, requireEvidence: false, reason: "NOT_DELIVERED" },
    { deadline: null, requireEvidence: true, reason: "NO_ITEMS" },
    { deadline: null, requireEvidence: false, reason: "NOT_DELIVERED" }
  ]), Date.now());
  assert.equal(state.available, false);
  assert.equal(state.message, "Returns become available after delivery. All items already have return requests.");
});
