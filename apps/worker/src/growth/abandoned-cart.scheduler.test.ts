import assert from "node:assert/strict";
import test from "node:test";
import { abandonedCartCutoffs } from "./abandoned-cart.scheduler.js";

test("abandoned-cart windows are deterministic and bounded", () => {
  const cutoffs = abandonedCartCutoffs(new Date("2026-09-01T12:00:00.000Z"), 60, 7);
  assert.equal(cutoffs.abandonedBefore.toISOString(), "2026-09-01T11:00:00.000Z");
  assert.equal(cutoffs.createdAfter.toISOString(), "2026-08-25T12:00:00.000Z");
});
