# Return policy enforcement — 2026-10-03

Reference inspection found delivery-based eligibility in `Client/src/pages/Returns.jsx`. Amiyo-App already stored admin return-policy settings and order-specific extensions but its create-return service did not consult either.

Creation now checks policy inside the serializable transaction, after ownership/delivered-package lookup and before evidence or business writes. An explicit `Order.returnWindowUntil` takes precedence; otherwise the package's recorded shipment delivery plus configured `windowDays` determines expiry. Equality with the deadline is expired. Missing/invalid/future delivery information fails closed unless an explicit deadline supplies the missing date decision; invalid/future delivery data still requires support verification.

The configured `requireEvidence` flag is enforced, then existing private-file ownership/purpose/status checks run. Missing settings use the same declared seven-day/evidence-required defaults as the admin settings screen. Malformed existing configuration fails with 503 rather than silently disabling policy. Restocking fees and automatic financial deductions are not introduced by this change.

Idempotency replay still occurs before eligibility checks, so an already committed request can be recovered after the window ends. New request keys do not bypass the policy. Fresh definite policy rejections allow the client to correct evidence or refresh; ambiguous retries retain their original recovery record.

Tests cover configured expiry, exact boundary, admin extension, missing/invalid/future dates, evidence required/optional, malformed configuration, rejection before writes, and replay after the original window. These are service/pure tests, not live provider or rendered browser acceptance. No database migration, seed or live return mutation was performed.

## Remaining acceptance

Validation: full `npm test` passed (including 91 repository script checks); final rebuild, six focused policy/replay tests and all 65 mobile tests passed. Secret scan and whitespace checks passed.

- Exact per-package deadline/eligibility UI is now implemented; see `return-eligibility-ui-2026-10-03.md`. Rendered browser/device acceptance remains open.
- Exercise policy changes and admin extensions in staging with real delivery events and configured evidence storage.
- Legacy delivered packages lacking delivery dates need operational reconciliation, not fabricated timestamps.
- Return-window snapshots, restocking-fee policy and historical financial acceptance need owner-approved semantics; do not infer them from the window guard.
