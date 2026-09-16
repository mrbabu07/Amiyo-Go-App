export function parcelCollectionAmount(totalMinor: bigint, payment: { method: string; status: string } | undefined, status: string): bigint {
  if (!payment || payment.method !== "COD") return 0n;
  if (["CAPTURED", "PARTIALLY_REFUNDED", "REFUNDED", "VOIDED", "FAILED"].includes(payment.status)) return 0n;
  if (["CANCELLED", "REJECTED", "RETURNED", "REFUNDED"].includes(status)) return 0n;
  return totalMinor;
}
