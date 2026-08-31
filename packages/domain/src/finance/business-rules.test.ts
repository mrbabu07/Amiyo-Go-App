import assert from "node:assert/strict";
import test from "node:test";
import { providerReferenceValid, refundProviderRule, settlementDecision, settlementProposalDecision, stackedPromotionDiscount } from "./business-rules.js";

test("provider refunds require external evidence for gateway payments", () => {
  assert.equal(refundProviderRule({ provider: "sslcommerz", method: "SSLCOMMERZ" }).mode, "provider_refund");
  assert.equal(providerReferenceValid({ provider: "sslcommerz" }, null), false);
  assert.equal(providerReferenceValid({ provider: "sslcommerz" }, "SSL-REF-1"), true);
  assert.equal(providerReferenceValid({ provider: "cod", method: "COD" }, null), true);
});

test("promotion stacking keeps one automatic discount under the cap", () => {
  const plan = stackedPromotionDiscount(100_000n, 20_000n, [
    { id: "auto-1", priority: 1, minimumSubtotalMinor: 0n, effect: { type: "PERCENT", rateBps: 2_000, maxDiscountMinor: null } }
  ]);
  assert.equal(plan.couponDiscountMinor, 20_000n);
  assert.equal(plan.automaticDiscountMinor, 15_000n);
  assert.equal(plan.totalDiscountMinor, 35_000n);
  assert.equal(plan.selectedPromotionId, "auto-1");
});

test("settlement requires approval, minimum amount, account and provider reference", () => {
  assert.equal(settlementDecision({ amountMinor: 10_000n, status: "REQUESTED", provider: "bank", providerRef: "TXN", bankAccountVerified: true }).code, "PAYOUT_NOT_APPROVED");
  assert.equal(settlementDecision({ amountMinor: 10_000n, status: "APPROVED", provider: "bank", providerRef: "TXN", bankAccountVerified: true }).code, "PAYOUT_BELOW_MINIMUM");
  assert.equal(settlementDecision({ amountMinor: 50_000n, status: "APPROVED", provider: "bank", providerRef: "", bankAccountVerified: true }).code, "PAYOUT_REFERENCE_REQUIRED");
  assert.equal(settlementDecision({ amountMinor: 50_000n, status: "APPROVED", provider: "bank", providerRef: "TXN", bankAccountVerified: true }).eligible, true);
});

test("settlement proposals enforce approval, verified account and hold period", () => {
  const reviewedAt = new Date("2026-08-30T00:00:00.000Z");
  const now = new Date("2026-09-01T00:00:00.000Z");
  assert.equal(settlementProposalDecision({ amountMinor: 50_000n, status: "APPROVED", bankAccountVerified: true, reviewedAt }, 50_000n, 7, now).code, "PAYOUT_HOLD_ACTIVE");
  assert.equal(settlementProposalDecision({ amountMinor: 50_000n, status: "APPROVED", bankAccountVerified: true, reviewedAt }, 50_000n, 1, now).eligible, true);
});
