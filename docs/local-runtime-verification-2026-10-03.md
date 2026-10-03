# Local runtime verification — 2026-10-03

## Scope and results

Local API with the existing database and imported Firebase Auth Emulator accounts. No account, order, return, payment or attachment fixtures were created by the smoke scripts. API checks were GET requests; authentication used the local emulator.

| Check | Result |
| --- | --- |
| `node scripts/marketplace-smoke.mjs` | 9 passed, no failures or skips |
| `node scripts/authenticated-marketplace-smoke.mjs` | 28 passed, no failures or skips |
| `node --test scripts/authenticated-marketplace-smoke.test.mjs` | 2 passed |
| `node scripts/secret-scan.mjs` | Passed |
| `git diff --check` | Passed |

The authenticated smoke now validates the admin return list against the shared contract, rejects customer/vendor access to the admin evidence-list endpoint with HTTP 403, and checks that admin evidence metadata contains only ID, name and MIME type. If no return fixture exists, the admin evidence-list check is explicitly skipped rather than creating one.

## Performance observation

Public request timings had a median of 633 ms and maximum of 3,624 ms. Timed authenticated requests had a median of 4,738 ms and maximum of 10,252 ms. These are sequential local-API/remote-database observations, not load-test results or production percentiles. Authenticated latency remains an investigation priority; passing response checks do not mean acceptable production performance.

## Not verified

- Real private evidence upload, signed download and expiry: local Firebase service-account/storage configuration is absent. A passing list check does not prove attachments exist or can be opened.
- Browser rendering, keyboard interaction, mobile layout and native devices in this pass.
- Production authentication, payment/refund providers, deployment, concurrency or load capacity.
- Complete visual and functional parity with the legacy reference.

Next verification should profile authenticated request/database time and then exercise real storage access in a configured non-production environment. Keep credentials and raw local reports out of commits.
