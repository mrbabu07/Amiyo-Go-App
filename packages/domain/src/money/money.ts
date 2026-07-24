export type CurrencyCode = "BDT";

export type Money = {
  amountMinor: bigint;
  currency: CurrencyCode;
};

export function bdt(amountMinor: bigint | number): Money {
  return {
    amountMinor: BigInt(amountMinor),
    currency: "BDT"
  };
}

export function addMoney(left: Money, right: Money): Money {
  assertSameCurrency(left, right);
  return bdt(left.amountMinor + right.amountMinor);
}

export function assertSameCurrency(left: Money, right: Money) {
  if (left.currency !== right.currency) {
    throw new Error("Currency mismatch");
  }
}
