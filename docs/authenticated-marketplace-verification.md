# Authenticated marketplace API verification

## Repeatable local check

Run `npm run smoke:authenticated` with the existing local API and Firebase Auth Emulator running. Existing demo customer, vendor and admin accounts must already be present. The script does not seed accounts, change roles, create orders, refund payments or issue payouts. Normal authentication may update login bookkeeping.

`SMOKE_API_URL` and `SMOKE_AUTH_URL` accept loopback HTTP origins only. Demo passwords are never sent to remote/staging/production hosts. Redirects are rejected, requests have deadlines, and results do not print tokens, passwords, response bodies or customer details.

The checks cover login, active roles, customer/vendor order lists, admin workspace, vendor finance, monthly statements/commission invoices, customer order detail/tracking, admin order detail, vendor package documents and cross-role denial. Missing accounts or missing order fixtures fail the run rather than claiming complete coverage.

## Evidence and limits

The expanded live local run on 2026-09-28 passed all 24 checks with no skipped fixtures: three existing emulator logins, three active role checks, order/workspace/finance reads, monthly reports, order detail/tracking, vendor package documents and cross-role/order denial. API calls took approximately 1.9 to 8.9 seconds in that run; session reads took 2.1 to 4.1 seconds. These timings are observations, not a load test or a production latency guarantee. Remaining latency needs profiling before launch.

`npm test` passed the workspace suites and all 91 repository tests, including the smoke runner's loopback and sanitized-failure tests. `npm run secret:scan` and `git diff --check` also passed.

An additional duplicate session lookup was removed from `GET /api/v2/me`: authentication already synchronizes the current request's session. The handler now returns that verified session with `Cache-Control: no-store`. An HTTP regression verifies that every request still authenticates, revoked tokens fail and suspended users are denied. No shared permission/session cache was introduced.

This is authenticated API read coverage, not browser UI acceptance or checkout-to-delivery E2E. Existing seeded orders prove read/authorization behavior only. Live payment/refund/payout, concurrent shopping, device PDF/camera/push, historical finance reconciliation and deployment recovery remain separate launch gates.

## Session conflict hardening follow-up

Removed the stale-session fallback after a login activity write conflict. Recovery now requires a fresh database record: a deleted account receives 401, current suspension and permission removals are preserved, and a failed reread propagates instead of authorizing old data. All nine targeted identity service/route tests passed, including three new conflict regressions. The full `npm test` rerun also passed workspace suites and 91 repository tests; secret scanning passed.

The latest authenticated smoke rerun did not pass: the local API/auth emulator ports (4000/9099) had no listeners, all three demo logins failed and dependent checks were skipped. The earlier 24-check success is historical evidence, not a successful rerun of this patch. No live payment, refund or payout was initiated.
