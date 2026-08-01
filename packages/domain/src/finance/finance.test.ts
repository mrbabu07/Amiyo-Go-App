import test from "node:test";
import assert from "node:assert/strict";
import { assertAvailableBalance, assertRefundLimit, calculateCommission, calculateLedgerBalance } from "./finance.js";

test("commission uses integer basis points and clamps to subtotal", () => {
  assert.equal(calculateCommission(10_001n, 750, 20n), 770n);
  assert.equal(calculateCommission(100n, 10_000, 10n), 100n);
});

test("append-only entries derive the wallet balance", () => {
  assert.equal(calculateLedgerBalance([{ direction: "CREDIT", amountMinor: 5_000n }, { direction: "DEBIT", amountMinor: 1_250n }]), 3_750n);
});

test("payout and refund limits reject overdraw", () => {
  assert.throws(() => assertAvailableBalance(99n, 100n));
  assert.throws(() => assertRefundLimit(1_000n, 400n, 601n));
  assert.doesNotThrow(() => assertRefundLimit(1_000n, 400n, 600n));
});
