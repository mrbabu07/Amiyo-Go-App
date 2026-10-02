# Checkout policy parity follow-up

Date: 2026-10-02

## Gaps fixed

- Guest checkout previously displayed every payment method regardless of admin configuration. Both checkout flows now use a shared enabled-payment policy matching the API mapping (bKash and Nagad currently share the manual-payment toggle).
- Unknown/failed platform settings block submitting instead of implicitly enabling payments. The UI offers settings retry after a fetch failure.
- Required COD phone confirmation is visible and submitted in guest checkout. Confirmation resets when its phone/account changes; customer confirmation resets on selected address/account changes.
- Maintenance, required upazila/union and paused rural delivery are checked before submission. The server remains authoritative if configuration changes after loading.
- Customer submit requires an address belonging to the currently loaded address list, not just a stale selected ID.
- Small-screen checkout columns stack; guest fields become full-width below 600px to avoid minimum-width overflow inside padded cards.

## Evidence and limits

Mobile type checking and all 41 mobile tests passed. Full regression passed workspace suites and all 91 repository tests. Five new policy tests exercise missing settings, payment toggles, COD confirmation, geography and maintenance. Secret scanning and whitespace checks passed.

Browser check: opened `/checkout` in Chrome at 360x800. The signed-out checkout gate rendered without horizontal page overflow (viewport and document widths both 360px), and its screenshot was inspected. Login was required to reach the actual form; demo-login confirmation was requested, so authenticated form layout and controls are not marked visually verified. The temporary viewport override was reset.

Remaining: native/browser visual verification, full multi-store checkout-to-delivery and refund/payout staging journeys, provider credentials/operations approval and production deployment. No production payment, refund or payout was initiated for this change.
