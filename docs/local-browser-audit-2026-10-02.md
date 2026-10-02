# Local browser audit — 2026-10-02

Scope: local demo/reference acceptance only; no live payments or production operations.

## Observed and fixed

The checkout sign-in gate led to `/auth`. The initial DOM exposed email/password inputs only by placeholders and rendered demo selection, submit and mode-switch actions without button roles. Updated `AuthScreen.tsx` with explicit field labels, button/link semantics, named demo actions, disabled/busy state, error alerts, autofill hints and password keyboard submission. Keyboard submission now applies the same basic input/busy validation as the button.

After reload, the browser DOM confirmed `Email` and `Password` textboxes, three named demo-account buttons, a disabled empty-form `Sign in` button and a `Back to shop` link. The rendered desktop login screenshot was inspected before the change; no authenticated checkout screenshot was obtained.

## Limits

## Follow-up: authenticated mobile audit

Password-field Enter successfully signed in the existing local demo customer. The account page showed the customer profile, two orders, one active delivery, one return and the saved address. At 360 x 800, account and orders screenshots were inspected and both pages had document width and scroll width of 360px. The orders page loaded both seeded purchases and a product thumbnail. No order/payment was submitted.

The order-card link had no real destination in the DOM and the attempted keyboard activation left the order list visible. Detail, tracking and invoice actions also lacked link semantics. Replaced these with Expo Router links carrying actual destinations and order-specific accessible names, made action targets at least 44px high, and subscribed the list to auth changes with `useCurrentUser` while retaining UID-scoped caching. Browser checking caught an Expo Router style-array incompatibility during implementation; the link child now receives flattened styles.

Validation: 43 mobile tests, final mobile type-check and secret scan pass. The source regression covers destinations, labels, account-scoped queries and flattened link styles. After reload, the browser DOM exposed all actual order URLs. Keyboard Enter on the first View details link navigated to the order-detail loading screen. Full detail content and checkout acceptance are not established by this navigation check.

The interaction limitation below describes the earlier attempt, not the now-successful keyboard login. Customer/vendor/admin end-to-end acceptance remains open.

Browser interaction repeatedly returned detached-command errors for both old and updated controls; a fresh tab and documented alternate interaction surface did not resolve it. Navigation sometimes timed out while subsequent DOM reads succeeded. Demo selection did not populate the form in the last observed state. This is an unresolved browser-interaction blocker, not evidence of a successful login and not enough evidence to diagnose an application login failure.

Do not mark customer/vendor/admin journeys, cart mutations, authenticated checkout or full reference parity complete. No order/payment was submitted. Continue from a working browser connection and capture actual authenticated states before accepting those flows.
