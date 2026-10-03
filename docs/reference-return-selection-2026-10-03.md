# Customer return selection follow-up

The previous customer detail action submitted every item at its full purchased quantity, a generic reason and a fixed original-payment preference. The reference Orders page has a guided return/review workflow and explicit refund choices.

Implemented a separate customer return form with zero-selected initial quantities, bounded per-item steppers, reason choices, optional details and a review/confirm step. Only selected items are submitted. A package must itself be delivered; a delivered parent status does not override a non-delivered package. The form resets with account/package identity and guards immediate double submission.

Refund options are deliberately limited to the current API's `ORIGINAL_PAYMENT` and `MANUAL`. The form does not claim automated bKash/Nagad/Rocket/Upay refunds, collect payout credentials, promise eligibility, or treat a submitted request as an approved refund. Existing server ownership and already-requested quantity checks remain authoritative. Previously returned quantities are not yet exposed as remaining quantities in this form.

Validation covers partial selection, empty/invalid/excess quantities, foreign item IDs, reason/details limits, refund preference and confirmation wiring. Browser/device acceptance, attachment evidence, remaining return quantities, transport-retry recovery, provider-specific refund account capture and the full checkout/return E2E remain open. This is not a claim of full reference parity.

Results: mobile type-check, full `npm test` (workspace suites including 53 mobile tests, then 91 repository tests), secret scan and whitespace checks passed. No real return or refund was submitted.

## Remaining quantity follow-up

Customer order detail now provides `returnableQuantity` per item. It subtracts quantities in return requests other than `REJECTED` and `CLOSED`, matching the existing create-return service's accounting rule, and returns zero for non-delivered packages. This count is an allowance under the current rules, not proof that a refund is approved or completed.

The form displays purchased and remaining quantities, disables additions at the remaining limit, and revalidates the reviewed selection against the latest loaded order before submission. The server still enforces ownership and quantity limits transactionally if another request wins a race. Legacy responses without the field retain the purchased-quantity fallback and server validation.

Tests cover aggregated previous requests, the excluded-status query, explicit zero, partial allowance, legacy responses, over-limit selection and a reviewed quantity becoming unavailable. Browser/device, evidence attachment and ambiguous transport-retry recovery remain open. The earlier remaining-quantity gap is now addressed in code, not yet visually accepted.

Follow-up results: full `npm test` passed (54 mobile tests within workspace suites and 91 repository tests), mobile type-check passed after correcting a test fixture's inferred type, and secret/whitespace checks passed.
