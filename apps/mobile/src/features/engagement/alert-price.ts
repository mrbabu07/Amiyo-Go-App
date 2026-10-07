import { alertTargetMinorSchema } from "@amiyo/contracts";

export function alertPriceToMinor(input: string): string {
  const normalized = input.trim().replace(/[০-৯]/g, (digit) => String("০১২৩৪৫৬৭৮৯".indexOf(digit)));
  if (!/^\d{1,17}(?:\.\d{1,2})?$/.test(normalized)) throw new Error("Enter a positive BDT price with up to two decimal places.");
  const [whole, fraction = ""] = normalized.split(".");
  const minor = (BigInt(whole!) * 100n + BigInt(fraction.padEnd(2, "0"))).toString();
  if (!alertTargetMinorSchema.safeParse(minor).success) throw new Error("Enter a positive price within the supported range.");
  return minor;
}

export function alertMinorToPrice(minor: string): string {
  const amount = BigInt(minor);
  return `${amount / 100n}.${(amount % 100n).toString().padStart(2, "0")}`;
}
