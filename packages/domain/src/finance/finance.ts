export function calculateCommission(subtotalMinor: bigint, rateBps: number, fixedMinor: bigint) {
  if (subtotalMinor < 0n || fixedMinor < 0n || !Number.isInteger(rateBps) || rateBps < 0 || rateBps > 10_000) throw new RangeError("Invalid commission input");
  const calculated = (subtotalMinor * BigInt(rateBps)) / 10_000n + fixedMinor;
  return calculated > subtotalMinor ? subtotalMinor : calculated;
}

export function calculateLedgerBalance(entries: readonly { direction: "CREDIT" | "DEBIT"; amountMinor: bigint }[]) {
  return entries.reduce((balance, entry) => balance + (entry.direction === "CREDIT" ? entry.amountMinor : -entry.amountMinor), 0n);
}

export function assertAvailableBalance(balanceMinor: bigint, requestedMinor: bigint) {
  if (requestedMinor <= 0n) throw new RangeError("Payout amount must be positive");
  if (requestedMinor > balanceMinor) throw new RangeError("Payout exceeds available balance");
}

export function assertRefundLimit(capturedMinor: bigint, alreadyRefundedMinor: bigint, requestedMinor: bigint) {
  if (requestedMinor <= 0n || alreadyRefundedMinor < 0n || requestedMinor + alreadyRefundedMinor > capturedMinor) throw new RangeError("Refund exceeds captured payment");
}
