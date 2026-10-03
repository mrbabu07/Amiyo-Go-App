# Customer cancellation follow-up

The legacy `Client/src/pages/Orders.jsx` asks for a cancellation reason and confirmation. The mobile detail screen previously cancelled immediately with a hard-coded reason.

Changes:
- Cancel now opens an inline confirmation panel with a required 3–500 character reason and a Keep order action. Confirm is disabled while submitting or when eligibility expires.
- The submit handler rechecks time/status eligibility; server checks remain authoritative.
- Customer detail now exposes optional `placedAt`; the UI uses placement time and falls back to `createdAt` for legacy responses, matching the server.
- The server rejects the exact 30-minute deadline, matching the UI's strict pre-deadline rule.
- Confirmation is closed when the order/account changes and after a successful cancellation.

Verification includes deterministic deadline/status tests, server deadline and placement-precedence tests, and source-level confirmation wiring checks. No real customer order was cancelled. This update does not verify browser E2E, return submission or refund-provider execution. Cancellation transport-retry/account-switch-in-flight acceptance also remains separate from these checks.

Results: mobile type-check and all 49 mobile tests passed. Full `npm test` passed (workspace suites and 91 repository tests), along with secret scan and whitespace checks.
