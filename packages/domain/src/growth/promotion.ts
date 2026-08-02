export interface PromotionCandidate {
  id: string;
  priority: number;
  minimumSubtotalMinor: bigint;
  effect: { type: "FIXED"; amountMinor: bigint } | { type: "PERCENT"; rateBps: number; maxDiscountMinor?: bigint | null };
}

export function promotionDiscount(subtotalMinor: bigint, candidate: PromotionCandidate) {
  if (subtotalMinor < candidate.minimumSubtotalMinor) return 0n;
  const raw = candidate.effect.type === "FIXED" ? candidate.effect.amountMinor : (subtotalMinor * BigInt(candidate.effect.rateBps)) / 10_000n;
  const capped = candidate.effect.type === "PERCENT" && candidate.effect.maxDiscountMinor !== null && candidate.effect.maxDiscountMinor !== undefined && raw > candidate.effect.maxDiscountMinor ? candidate.effect.maxDiscountMinor : raw;
  return capped > subtotalMinor ? subtotalMinor : capped;
}

export function selectPromotion(subtotalMinor: bigint, candidates: readonly PromotionCandidate[]) {
  return candidates.filter((candidate) => promotionDiscount(subtotalMinor, candidate) > 0n).sort((left, right) => right.priority - left.priority || left.id.localeCompare(right.id))[0] ?? null;
}
