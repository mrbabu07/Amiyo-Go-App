# Session query performance — 2026-10-03

## Finding and change

Read-only profiling of the existing customer session recorded seven database query events per read. An initial sample took 3,894 ms, with subsequent samples at 1,925 ms and 2,207 ms. Sequential relation fetching compounds remote database latency.

Existing-user authentication, conflict recovery and `getSession` now read the user first, then load profile, roles/permissions and active vendor memberships concurrently with `Promise.all`. Each branch remains scoped to the resolved user ID. This is not an authorization cache. Missing users stop before relation reads; any failed branch rejects the whole session. Creation and update transaction behavior is unchanged.

No database migration, Prisma preview feature, token-revocation relaxation or credential change is required. Concurrency requires available pool capacity; reduced serial waiting does not mean fewer SQL statements or proven capacity under load.

## Alternating read-only comparison

The same process compared the previous nested include against the new service read using existing demo identities. No fixture or business writes were made by this comparison. Each sample checked status, email, display name, roles, vendor IDs and merged permission parity without printing identifiers, tokens, SQL parameters or customer data.

| Role | Sample | Previous read (ms) | Parallel read (ms) |
| --- | --- | --- | --- |
| Customer | 1 | 3,932 | 2,899 |
| Customer | 2 | 4,063 | 1,723 |
| Vendor | 1 | 3,447 | 2,555 |
| Vendor | 2 | 3,657 | 2,015 |
| Admin | 1 | 2,294 | 1,436 |
| Admin | 2 | 2,017 | 1,444 |

All six parity comparisons passed. Query-event counts remained seven for customer/admin; vendor counts were eight before and nine/ten after. This is an improvement in the observed serial wait, not a query-count optimization. Small sequential samples over a remote database are not controlled load benchmarks or production percentiles.

## Automated verification

- Build and full `npm test` passed, including 91 repository script checks.
- Focused identity service suite: 11 tests passed.
- Added regression coverage for concurrent branch execution, user scoping, active membership filtering, denied permission exclusion, missing users and fail-closed relation errors.
- Existing concurrent-login conflict, deleted-account and changed-permission tests remain passing.
- Secret scan and whitespace checks passed.
- Authenticated smoke against the rebuilt local API on port 4010: 28 passed, no failures or skips. Timed-request median was 4,280 ms and maximum 9,103 ms. Whole-endpoint latency therefore remains high despite the isolated session-read improvement.

Remaining work includes connection-pool/load testing, endpoint-specific query profiling, real storage-provider testing and browser/device verification. This does not certify reference parity or production readiness.
