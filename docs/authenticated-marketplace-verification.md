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

The first authenticated smoke rerun could not run successfully because local API/auth emulator ports (4000/9099) had no listeners. After starting the existing local API and Firebase Auth Emulator, the follow-up passed all 24 checks with zero skips against the session-conflict patch. The standard emulator startup restores/seeds local demo identities; the smoke runner itself does not seed. No live payment, refund or payout was initiated.

## Local follow-up acceptance (2026-09-28)

- `npm run smoke:marketplace`: all nine checks passed, including catalog detail and unauthenticated access denials.
- `npm run smoke:authenticated`: all 24 checks passed against the running local API/emulator.
- `npm run smoke:load` with 10 requests, concurrency 2, targeting `/api/v2/catalog/products?limit=2`: zero failures; p50 4ms, p95/max 47ms. This is a tiny warmed-cache read test, not checkout capacity, cold-start or production load evidence.
- `npm run release:check`: reports `blocked`, 27 unresolved decisions, 16 required files checked. The command's default zero exit code is documentary mode, not release approval; set `REQUIRE_PRODUCTION_READY=true` for a failing gate when blocked.

Still unverified: full browser/native purchase journeys, real provider callbacks/refunds, native camera/PDF/push acceptance, production deployment/restore and approved legacy balance reconciliation. Local smoke success does not remove these gates.

## 2026-10-23 Follow-up

All 32 loopback authenticated checks passed after customer and admin order-detail relations were separated into ownership-first, concurrent reads. In this run, customer order detail completed in 7,851 ms and admin order detail in 7,003 ms, down from the prior roughly 10-second observations but still above a production-quality latency target. The same run observed 1,391-7,266 ms across the remaining authenticated checks. These numbers use a local API with a remote development database and are diagnostic evidence, not staging percentiles or a capacity result.

Expo SDK 57 compatibility patches were also applied and verified with `expo install --check`, mobile TypeScript, all 450 mobile tests, and a production web export. Release readiness remains blocked on external decisions and 19 dependency audit findings (16 high, 3 moderate); unsafe Expo/React Native downgrades suggested by automated audit tooling were not applied.
