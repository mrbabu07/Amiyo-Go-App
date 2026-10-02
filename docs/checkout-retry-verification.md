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

## Durable recovery follow-up

Order POSTs now persist a versioned recovery record before sending: original idempotency key, timestamp and validated checkout input (address ID, payment method, coupon/rewards/confirmation flags). No bearer tokens, card data, full delivery address or payment result are stored. Storage is account-scoped using a SHA-256 UID suffix; it is local app storage, not an encrypted payment vault.

Both checkout screens check this record before requiring a current cart quote. After reload/restart, customers can retry the original request even if the server already converted the cart. A pending record prevents replacing the original input. Successful validated responses clear the matching record. Selected definite business rejections clear a newly created record; ambiguous network/server/provider failures and prior uncertain attempts retain it.

Recovery stops at 23 hours (before the API's 24-hour idempotency expiry), or if the local clock moves before the saved timestamp. Expired/corrupt records direct the customer to order history/support; they are not silently deleted or resubmitted with a new key. Concurrent submits within this app runtime are blocked.

Type checking and all 36 mobile tests passed, including five durable recovery tests covering restart replay, account isolation, edited requests, expiry, corruption, persistence errors and rejection handling. The full regression rerun passed workspace suites and all 91 repository tests. Expo web export succeeded; secret scan and whitespace checks passed. A successful export is not browser visual acceptance.

This is not a full payment-provider or device acceptance test. Browser/native visual acceptance, actual force-kill/restart with gateway responses and multi-tab concurrent checkout remain unverified. Clearing app/browser storage or losing the guest identity loses local recovery; use order history/support. An address request whose response itself is lost can still require address deduplication. Expired/ambiguous records require operator reconciliation; there is deliberately no blind reset button.

No live orders, refunds or payouts were initiated to validate these UI changes. Reference visual parity, physical-device acceptance and production deployment are not certified by these tests.
