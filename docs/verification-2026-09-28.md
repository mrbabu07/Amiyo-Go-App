# Verification follow-up — 2026-09-28

Historical note: counts in this document are the results recorded on 2026-09-28. As of 2026-10-25, the current release checker reports one unresolved business decision, five propagated high Expo build-tool package nodes, clean API/worker runtime audits, and six missing external evidence artifacts.

## Implemented

- Authenticated retries retain the originating Firebase identity. Switching accounts before or during refresh prevents replay; a late failure cannot sign out another account.
- Temporary refresh network failures no longer forcibly sign out the customer. Revoked or repeatedly rejected credentials still invalidate the matching session.
- Auth bootstrap clears cached queries on identity changes and rejects stale session responses. Order lists, details, tracking and invoice/document queries include user identity in their keys. Batch previews are also keyed by identity.
- Added `npm run smoke:marketplace`: read-only health/readiness, nonempty catalog/shop contracts, product details and unauthenticated customer/vendor/admin access checks. Set `SMOKE_API_URL` for staging; `SMOKE_REQUIRE_DATA=0` allows an intentionally empty catalog. It creates no orders or payments.

## Evidence and limits

### Commission assessment follow-up

- Added vendor-owned monthly commission assessment API and web/native PDF export; reports expose the order-date basis and explicitly do not claim settled charges or tax-invoice parity.
- Four new service tests and one HTML test pass. Full workspace tests and 89 repository checks pass; mobile type-check, Expo web export, secret scan and nine read-only marketplace smoke checks pass.
- Final settled-charge invoice remains blocked by unverified order-to-wallet credit/reversal accounting. No provider transactions, production data migrations, manual wallet credits or fabricated VAT were performed.

### Earlier authentication verification

- Mobile tests: 15 passed, including account-change, revoked-credential, late-response and retry idempotency regressions.
- Mobile type-check, Expo web export and secret scan passed.
- Full `npm test` passed: workspace suites and all 89 repository checks. The source assertion for token invalidation was updated to require the new matching-account guard; behavioral tests cover replay and sign-out isolation.
- Initial API warmup could not reach Neon. Connectivity recovered on retry: all nine read-only marketplace smoke checks passed, including database readiness, nonempty categories/products/shops, product detail and guest denial for protected routes. This is not authenticated checkout/provider acceptance.
- Production release checker still reports 27 unresolved decisions. This is a documentary gate, not evidence of completed provider/device acceptance.
- Authenticated customer/vendor/admin browser journeys, real-device scanning/PDF/printing, live provider transactions, deployment and recovery drills remain unverified. No 100% reference-equivalence or production-ready claim is made.
