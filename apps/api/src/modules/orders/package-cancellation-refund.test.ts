import assert from "node:assert/strict";
import test from "node:test";
import { packageCancellationRefundAmount, packagePaymentShares } from "./package-cancellation-refund.js";

test("captured payment is allocated exactly across seller packages including order-level adjustments", () => {
  const packages = [{ id: "b", totalMinor: 300n }, { id: "a", totalMinor: 700n }];
  const shares = packagePaymentShares(packages, 950n);
  assert.deepEqual(shares, [{ id: "a", amountMinor: 665n }, { id: "b", amountMinor: 285n }]);
  assert.equal(shares.reduce((total, item) => total + item.amountMinor, 0n), 950n);
  assert.equal(packageCancellationRefundAmount(packages, 950n, "b"), 285n);
});

test("package cancellation allocation fails closed for missing or valueless packages", () => {
  assert.throws(() => packageCancellationRefundAmount([{ id: "a", totalMinor: 100n }], 100n, "missing"), /no refundable payment allocation/);
  assert.throws(() => packagePaymentShares([{ id: "a", totalMinor: 0n }], 100n), /cannot be allocated/);
});
