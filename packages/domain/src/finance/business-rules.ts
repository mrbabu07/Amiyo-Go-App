import { promotionDiscount, selectPromotion, type PromotionCandidate } from "../growth/promotion.js";

export type RefundPayment = { provider?: string | null; method?: string | null };
export type RefundProviderRule = { mode: "provider_refund" | "internal_refund"; provider: string; requiresProviderReference: boolean; reason: string };
export type SettlementInput = { amountMinor: bigint; status: string; provider?: string | null; providerRef?: string | null; bankAccountVerified?: boolean };
export type SettlementDecision = { eligible: boolean; code: string; reason: string };

const providerRefundMethods = new Set(["sslcommerz", "bkash", "nagad"]);
const internalRefundMethods = new Set(["cod", "manual", "wallet"]);
export const minimumPayoutMinor = 50_000n;
export const maximumStackedDiscountBps = 3_500;

export function refundProviderRule(payment: RefundPayment): RefundProviderRule {
  const provider = String(payment.provider || payment.method || "manual").trim().toLowerCase();
  if (providerRefundMethods.has(provider)) return { mode: "provider_refund", provider, requiresProviderReference: true, reason: `${provider.toUpperCase()} refunds require a confirmed provider refund reference.` };
  if (internalRefundMethods.has(provider)) return { mode: "internal_refund", provider, requiresProviderReference: false, reason: `${provider.toUpperCase()} refunds are reconciled through the marketplace ledger.` };
  return { mode: "provider_refund", provider, requiresProviderReference: true, reason: "Unknown payment providers require manual provider evidence before completion." };
}

export function providerReferenceValid(payment: RefundPayment, providerRefundId?: string | null) {
  const rule = refundProviderRule(payment);
  return !rule.requiresProviderReference || Boolean(providerRefundId?.trim());
}

export function stackedPromotionDiscount(subtotalMinor: bigint, couponDiscountMinor: bigint, candidates: readonly PromotionCandidate[] = []) {
  const selected = selectPromotion(subtotalMinor, candidates);
  const automaticDiscountMinor = selected ? promotionDiscount(subtotalMinor, selected) : 0n;
  const cap = (subtotalMinor * BigInt(maximumStackedDiscountBps)) / 10_000n;
  const total = couponDiscountMinor + automaticDiscountMinor;
  const cappedTotal = total > cap ? cap : total;
  return {
    couponDiscountMinor: couponDiscountMinor > cappedTotal ? cappedTotal : couponDiscountMinor,
    automaticDiscountMinor: cappedTotal > couponDiscountMinor ? cappedTotal - couponDiscountMinor : 0n,
    totalDiscountMinor: cappedTotal,
    selectedPromotionId: cappedTotal > couponDiscountMinor ? selected?.id ?? null : null,
    capMinor: cap
  };
}

export function settlementDecision(input: SettlementInput): SettlementDecision {
  if (!["APPROVED", "PROCESSING"].includes(input.status)) return { eligible: false, code: "PAYOUT_NOT_APPROVED", reason: "Payout must be approved before settlement." };
  if (input.amountMinor < minimumPayoutMinor) return { eligible: false, code: "PAYOUT_BELOW_MINIMUM", reason: "Payout amount is below the minimum settlement threshold." };
  if (input.bankAccountVerified === false) return { eligible: false, code: "PAYOUT_ACCOUNT_UNVERIFIED", reason: "A verified vendor bank or MFS account is required." };
  if (!input.provider?.trim() || !input.providerRef?.trim()) return { eligible: false, code: "PAYOUT_REFERENCE_REQUIRED", reason: "Provider and transaction reference are required before marking a payout paid." };
  return { eligible: true, code: "PAYOUT_SETTLEMENT_APPROVED", reason: "Payout has the required approval and provider evidence." };
}
