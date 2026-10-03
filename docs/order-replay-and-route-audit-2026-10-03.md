# Order replay and route audit — 2026-10-03

## Service replay evidence

Two new tests execute the real `OperationsService` methods with a stateful transaction double. The double saves idempotency output, then simulates a lost response after commit. It is not a live PostgreSQL/network fault test.

- Captured-payment cancellation performs inventory release, reservation release, package cancellation, order update, refund creation, outbox, audit and idempotency write once. Retrying with the original key/version after the 30-minute eligibility deadline returns the saved result without repeating these effects.
- Partial return replay preserves requested quantity and amount without adding another return, audit or outbox event.
- Changed input with the same key is rejected; another customer's key scope cannot replay the first customer's result. Suspended users cannot replay a return.

The mobile fresh-rejection allowlist also now includes `RETURN_EVIDENCE_INVALID`, a validation error raised before return writes. Customers can correct invalid evidence on a definite initial rejection; ambiguous retries retain their record.

Validation: focused replay tests and full `npm test` passed, including 91 repository script checks. No live orders, refunds, inventory or returns were mutated by these tests.

## Reference route inventory

A read-only comparison of `Client/src/routes/Routes.jsx` with Expo files under `apps/mobile/app` inspected 137 explicit reference child paths. Dynamic parameter names were normalized, Expo route groups removed and index paths normalized. 136 had matching route-file paths; `/auth-debug` was the sole unmatched path. It is a debug surface, not evidence of a missing customer workflow.

This is path coverage only. It does not prove that aliases render equivalent controls, that API behavior matches, that permissions are equivalent, or that layouts visually match. The legacy Client/Server files were not modified.

Next acceptance work must inspect actual customer/vendor/admin screen behavior and representative workflows, not add duplicate routes merely to improve a route count. Browser setup failure, provider configuration and real-device gates remain open in `completion-audit-2026-10-03.md`.
