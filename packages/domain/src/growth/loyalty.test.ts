import assert from "node:assert/strict";
import test from "node:test";
import { defaultLoyaltyPolicy, loyaltyPointsEarned, loyaltyRedemption, loyaltyRefundReversal, loyaltyReleaseAt } from "./loyalty.js";

test("loyalty earns one percent equivalent using integer points", () => {
  assert.equal(loyaltyPointsEarned(999_999n), 99n);
  assert.equal(loyaltyPointsEarned(1_000_000n), 100n);
});

test("loyalty redemption respects balance, minimum and payable cap", () => {
  assert.deepEqual(loyaltyRedemption(50n, 1_000n, 100_000n), { points: 0n, amountMinor: 0n });
  assert.deepEqual(loyaltyRedemption(500n, 300n, 100_000n), { points: 200n, amountMinor: 20_000n });
});

test("partial refunds reverse earned points conservatively", () => {
  assert.equal(loyaltyRefundReversal(101n, 2_500n, 10_000n), 26n);
  assert.equal(loyaltyRefundReversal(101n, 10_000n, 10_000n), 101n);
});

test("loyalty fraud hold uses the configured release delay", () => {
  assert.equal(loyaltyReleaseAt(new Date("2026-09-01T00:00:00.000Z"), defaultLoyaltyPolicy).toISOString(), "2026-09-08T00:00:00.000Z");
});
