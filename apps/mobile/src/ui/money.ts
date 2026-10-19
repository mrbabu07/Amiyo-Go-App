function groupedInteger(value: string) {
  if (value.length <= 3) return value;
  const tail = value.slice(-3);
  const head = value.slice(0, -3);
  const groups: string[] = [];
  for (let cursor = head.length; cursor > 0;) {
    const start = Math.max(0, cursor - 2);
    groups.unshift(head.slice(start, cursor));
    cursor = start;
  }
  return `${groups.join(",")},${tail}`;
}

export function formatMinor(amountMinor: string | bigint, currency = "BDT", minimumFractionDigits: 0 | 2 = 0) {
  const raw = String(amountMinor);
  if (!/^-?\d+$/.test(raw)) return currency === "BDT" ? "৳—" : `${currency} —`;
  const negative = raw.startsWith("-");
  const digits = (negative ? raw.slice(1) : raw).replace(/^0+(?=\d)/, "").padStart(3, "0");
  const whole = digits.slice(0, -2).replace(/^0+(?=\d)/, "");
  const fraction = digits.slice(-2);
  const decimal = minimumFractionDigits === 2 || fraction !== "00" ? `.${fraction}` : "";
  const value = `${negative ? "-" : ""}${groupedInteger(whole)}${decimal}`;
  return currency === "BDT" ? `৳${value}` : `${currency} ${value}`;
}

export function sumMinor(values: Iterable<string | bigint>) {
  let total = 0n;
  for (const value of values) total += BigInt(value);
  return total;
}

export function subtractMinorFloor(totalMinor: string | bigint, deductionMinor: string | bigint) {
  const result = BigInt(totalMinor) - BigInt(deductionMinor);
  return result > 0n ? result : 0n;
}

export const subtractMinor = (totalMinor: string | bigint, deductionMinor: string | bigint) => BigInt(totalMinor) - BigInt(deductionMinor);
export const multiplyMinor = (amountMinor: string | bigint, quantity: number) => BigInt(amountMinor) * BigInt(quantity);
export const isPositiveMinor = (amountMinor: string | bigint) => BigInt(amountMinor) > 0n;

export function compareMinor(leftMinor: string | bigint, rightMinor: string | bigint) {
  const left = BigInt(leftMinor);
  const right = BigInt(rightMinor);
  return left < right ? -1 : left > right ? 1 : 0;
}

export function percentageDiscount(priceMinor: string | bigint, compareAtMinor: string | bigint) {
  const price = BigInt(priceMinor);
  const compareAt = BigInt(compareAtMinor);
  if (price < 0n || compareAt <= price) return 0;
  return Number(((compareAt - price) * 100n + compareAt / 2n) / compareAt);
}
