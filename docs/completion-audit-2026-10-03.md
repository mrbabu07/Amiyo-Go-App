# Completion audit — 2026-10-03

Target: complete legacy Client/Server reference behavior and responsive UI in Amiyo-App, retaining the selected brand theme. Production/native/provider work previously deferred by the owner remains visibly outstanding; it is not silently treated as finished.

## Evidence and open gates

| Area | Current evidence | Still required |
| --- | --- | --- |
| API performance | Session and vendor-list optimizations, unit tests, 28 authenticated smoke checks, exact eight-package DTO parity | Endpoint-wide profiling and representative pool/load testing; last observed list HTTP time 6,248 ms is not launch acceptance |
| Customer/order actions | Existing checkout durable recovery; scoped order query; cancel/return completion guards added this pass | Browser account-switch testing; stable cancel/return idempotency recovery across ambiguous failures and reloads |
| Reference UI | Reference inventories and implemented routes/components | Rendered customer/vendor/admin comparison on mobile and desktop; keyboard/accessibility checks |
| Order lifecycle | Unit/integration suites and read-only role smoke | Complete isolated multi-store checkout-to-return/refund/settlement/payout journeys with observed outcomes |
| Evidence storage | Private metadata/access authorization tests | Configured non-production upload, signed download and expiry verification |
| Production/native | Launch checklist and runbooks | Owner/provider credentials, financial policy approval, deployment, backup restore and physical-device acceptance |

## This pass

Browser bootstrap failed with `failed to write kernel assets: The system cannot find the path specified`. No page was opened or screenshot verified; no UI acceptance is claimed. Source/test work can continue despite this environment problem.

Customer order detail now remounts its local state per order/account. Cancel and return mutation submission/completion check the live Firebase identity and component lifetime. Return navigation rechecks identity after awaited cache invalidation. A completed old-account request cannot intentionally navigate the current account through these callbacks. This does not cancel an already accepted server operation.

The added source-regression tests check the guard wiring, not mounted React behavior. Browser/device account-switch verification is still necessary. Durable cancel/return retry recovery remains open; generating a fresh key per mutation does not close that requirement.

Validation for this pass: mobile TypeScript check, full `npm test` (including 91 repository script checks), secret scan and whitespace check passed.

No finance acceptance, provider success, UI parity or whole-project completion is inferred from passing tests. Continue against the open gates rather than counting implemented features.
