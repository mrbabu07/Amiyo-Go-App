import { ApiProblem } from "../../middleware/api-problem.js";

type Package = { id: string; totalMinor: bigint };

export function packagePaymentShares(packages: Package[], paymentAmountMinor: bigint) {
  if (paymentAmountMinor <= 0n) throw new ApiProblem(409, "PACKAGE_REFUND_AMOUNT_INVALID", "Captured payment amount is invalid");
  const ordered = [...packages].sort((left, right) => left.id.localeCompare(right.id));
  if (!ordered.length || ordered.some((item) => item.totalMinor < 0n)) throw new ApiProblem(409, "PACKAGE_REFUND_ALLOCATION_INVALID", "Seller package values cannot be allocated");
  let remainingWeight = ordered.reduce((total, item) => total + item.totalMinor, 0n);
  if (remainingWeight <= 0n) throw new ApiProblem(409, "PACKAGE_REFUND_ALLOCATION_INVALID", "Seller package values cannot be allocated");
  let remainingAmount = paymentAmountMinor;
  return ordered.map((item) => {
    const amountMinor = remainingWeight > 0n ? remainingAmount * item.totalMinor / remainingWeight : 0n;
    remainingAmount -= amountMinor;
    remainingWeight -= item.totalMinor;
    return { id: item.id, amountMinor };
  });
}

export function packageCancellationRefundAmount(packages: Package[], paymentAmountMinor: bigint, packageId: string) {
  const allocation = packagePaymentShares(packages, paymentAmountMinor).find((item) => item.id === packageId);
  if (!allocation || allocation.amountMinor <= 0n) throw new ApiProblem(409, "PACKAGE_REFUND_ALLOCATION_INVALID", "Cancelled package has no refundable payment allocation");
  return allocation.amountMinor;
}
