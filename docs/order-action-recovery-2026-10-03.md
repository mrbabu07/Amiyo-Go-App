# Cancel/return recovery — 2026-10-03

## Implemented

Customer order detail saves each cancellation/return command before sending it, with a UUID, original input and creation timestamp. Storage is keyed by a hash of Firebase UID and parent order ID. Only one unresolved action may occupy that order's slot. Reloads reuse the original version, quantities, evidence references, reason and refund preference; changing input is blocked until the earlier outcome resolves.

A dedicated recovery panel retries the saved command independently of the current cancellation window or return quantity controls. The server still decides eligibility for a previously uncommitted request, while its existing idempotency replay runs before business eligibility checks. Recovery stops at 23 hours or a backwards clock, before the 24-hour server idempotency retention boundary.

Confirmed successful responses clear only the matching saved key. Network, unrecognized provider/API and ambiguous replay errors retain it. Only allowlisted definite pre-write errors on a fresh attempt clear it so validation can be corrected. Corrupt/read/write-failed storage blocks new submission rather than creating another key. Component and store-level guards prevent overlapping submission/preparation within the same runtime; account-switch completion guards remain in place.

## Verification and limits

Mobile type-check, all 65 mobile tests, full `npm test` including 91 repository script checks, secret scan and whitespace checks passed. No live cancellation/return was submitted during this pass.

Tests exercise reload/key reuse, original cancellation version, input-change rejection, partial-return evidence preservation, account/order isolation, key-safe cleanup, corrupt storage, storage failure, time boundaries, fresh rejection policy and concurrent preparation. Source regression checks verify the UI uses persisted keys; they do not simulate mounted React or real network loss.

Browser bootstrap is still unavailable in this environment. Real reload/offline recovery and account-switch acceptance need rendered browser/device tests. AsyncStorage does not provide a cross-tab/process compare-and-swap transaction, so simultaneous submissions from separate runtimes/devices remain outside the client lock guarantee. The backend remains authoritative for inventory, cancellation and return quantities.

Saved reason text and private evidence storage references remain on the device until successful cleanup; hashed storage keys are not encryption. Expired/unreadable or ambiguous requests require order/return reconciliation and support; no unsafe clear-and-resubmit button is offered. This is not full marketplace or production acceptance.
