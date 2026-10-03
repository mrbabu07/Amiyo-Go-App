# Authentication performance follow-up — 2026-10-03

## Implemented

Overlapping routers can authenticate the same Express request more than once. For example, the operations router covers `/api/v2/admin` before the admin workspace router. Each pass previously verified the Firebase token and loaded the database session again.

The authentication middleware now reuses its verified identity and active session only for the same request and unchanged bearer token. A module-private WeakMap avoids trusting a pre-populated `req.auth` and does not retain sessions across HTTP requests. Changed tokens are verified again. New requests still check token revocation, account status and current permissions. Route/service authorization remains unchanged.

## Validation

- Build passed.
- Full `npm test` passed, including mobile tests and 91 repository script checks.
- Final focused identity suite passed all 12 tests, including the existing bearer parsing tests.
- Regression test verifies one synchronization for overlapping middleware, fresh permissions on the next request, changed/revoked token denial and suspended-account denial.
- Authenticated runtime smoke against the rebuilt API on temporary port 4010: 28 passed, no failures or skips. No business fixtures were created.
- Secret scan and diff whitespace checks passed.

An initial probe used port 4001, which overlapped the Firebase emulator service; its invalid responses were discarded. The completed smoke run used the isolated API port 4010.

## Remaining performance work

The completed run observed a timed-request median of 4,567 ms and maximum of 9,875 ms, versus 4,738 ms and 10,252 ms in the earlier run. These are single sequential samples with a remote database, not controlled benchmarks; they do not establish a percentage improvement. Only routes crossing overlapping authentication middleware avoid duplicate work. General authenticated latency remains too high and requires database/query/network profiling.

This change does not establish production readiness, visual reference parity, real storage-provider behavior or load capacity. No cross-request authorization cache or disabled revocation checks were introduced.
