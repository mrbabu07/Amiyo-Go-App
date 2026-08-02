import assert from "node:assert/strict";
import test from "node:test";
import { notificationChannels } from "./notification-matrix.js";
import { promotionDiscount, selectPromotion } from "./promotion.js";

test("promotion selection is deterministic across input order", () => {
  const candidates = [{ id: "b", priority: 10, minimumSubtotalMinor: 0n, effect: { type: "FIXED" as const, amountMinor: 100n } }, { id: "a", priority: 10, minimumSubtotalMinor: 0n, effect: { type: "FIXED" as const, amountMinor: 200n } }];
  assert.equal(selectPromotion(1_000n, candidates)?.id, "a"); assert.equal(selectPromotion(1_000n, [...candidates].reverse())?.id, "a");
});

test("promotion discounts use integer math and caps", () => { assert.equal(promotionDiscount(10_001n, { id: "one", priority: 1, minimumSubtotalMinor: 0n, effect: { type: "PERCENT", rateBps: 750, maxDiscountMinor: 500n } }), 500n); });
test("notification matrix keeps high-value events explicit", () => { assert.deepEqual(notificationChannels("question.answered"), ["IN_APP", "PUSH"]); });
