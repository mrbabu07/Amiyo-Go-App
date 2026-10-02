# Local browser audit — 2026-10-02

Scope: local demo/reference acceptance only; no live payments or production operations.

## Observed and fixed

The checkout sign-in gate led to `/auth`. The initial DOM exposed email/password inputs only by placeholders and rendered demo selection, submit and mode-switch actions without button roles. Updated `AuthScreen.tsx` with explicit field labels, button/link semantics, named demo actions, disabled/busy state, error alerts, autofill hints and password keyboard submission. Keyboard submission now applies the same basic input/busy validation as the button.

After reload, the browser DOM confirmed `Email` and `Password` textboxes, three named demo-account buttons, a disabled empty-form `Sign in` button and a `Back to shop` link. The rendered desktop login screenshot was inspected before the change; no authenticated checkout screenshot was obtained.

## Limits

Browser interaction repeatedly returned detached-command errors for both old and updated controls; a fresh tab and documented alternate interaction surface did not resolve it. Navigation sometimes timed out while subsequent DOM reads succeeded. Demo selection did not populate the form in the last observed state. This is an unresolved browser-interaction blocker, not evidence of a successful login and not enough evidence to diagnose an application login failure.

Do not mark customer/vendor/admin journeys, cart mutations, authenticated checkout or full reference parity complete. No order/payment was submitted. Continue from a working browser connection and capture actual authenticated states before accepting those flows.
