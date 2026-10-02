# Checkout retry verification

Date: 2026-10-02

## Implemented

- Customer and guest checkout use one in-flight submit guard instead of relying on a React loading-state render to disable repeated presses.
- The same account and unchanged checkout input reuse an idempotency key after a failed response while the checkout screen remains mounted.
- A confirmed result is reused without another order POST. The API already binds checkout idempotency records to the authenticated user and request payload.
- Guest checkout retains a successfully created delivery address for the same account/form during retries; it does not create another address after a later order-response failure.
- Customer address/quote caches are account-scoped. Both flows suppress order-confirmation navigation when the active account changes during submission.
- Customer and guest checkout subscribe to auth changes rather than relying on an unobserved Firebase snapshot.

## Tests and limits

Mobile type checking and all 31 mobile tests passed, including four executable retry tests: lost response, concurrent submission, account separation and changed input while pending. The full `npm test` rerun passed workspace suites and all 91 repository tests after updating the coupon source-pattern assertion for the new retry wrapper. Secret scanning and whitespace checks passed.

This is not a full payment-provider or device acceptance test. Retry state is in memory: it does not survive reload, unmount or application restart. Edited checkout inputs use a different attempt key; after an uncertain payment/order response, customers should check order history before changing their purchase. An address request whose response itself is lost can still require address deduplication. Durable recovery across restarts and real gateway failure/reconciliation journeys remain acceptance work.

No live orders, refunds or payouts were initiated to validate these UI changes. Reference visual parity, physical-device acceptance and production deployment are not certified by these tests.
