# Test Strategy and Evidence

## Automated gates

- `npm run type-check`: strict TypeScript project references.
- `npm test`: workspace unit tests plus PostgreSQL-backed integration and cross-module contract tests.
- `npm run openapi:generate`: generated contract drift check.
- `npm run export:web --workspace @amiyo/mobile`: Expo web production bundle.
- `npm audit --audit-level=high`: blocks critical/high dependency findings.
- `npm run secret:scan`: blocks committed and untracked database credentials, private keys, Neon passwords, SSLCommerz store passwords, GitHub tokens, and AWS access keys without printing the detected value.
- `npm run release:check`: reports unresolved production decisions and missing handover artifacts.
- GitHub CI builds API and worker images, parses each compiled entrypoint inside its image, verifies both containers execute as non-root, and checks the embedded OCI revision equals the workflow commit SHA.

CI writes a commit/run-bound `ci-release-readiness.json` before the blocking dependency audit and uploads it even when a later gate fails. The production web export also runs before the audit, so a known advisory still fails CI without hiding independent build/export evidence.

Release readiness reports the complete production dependency graph and service-scoped API/worker runtime audits separately. On 2026-10-24 both backend workspace audits reported zero findings after the Zod 4.6.7/OpenAPI 9.1.0 upgrade; the complete graph remains blocked by five high findings inherited through the Expo CLI/build toolchain. A clean backend scope does not waive the mobile release gate.

Authenticated load checks use the same `npm run smoke:load` command with `LOAD_BEARER_TOKEN` supplied only through the process environment. Reports expose only `authenticated: true`; they never include the token or URL query values. Use a short-lived staging token, never a production user credential or a token committed to a file.

The staging role-boundary workflow also enforces `SMOKE_MAX_P95_MS` across its authenticated customer, seller and admin checks. The checked-in staging budget is 2,500 ms. Its immutable report records p50, p95, maximum, threshold and violations without tokens or response bodies; status correctness alone cannot pass the job when the latency budget is exceeded.

Authenticated verification is mandatory for every manually dispatched staging smoke; the workflow has no public-only bypass. A preflight gate rejects missing, non-HTTPS, credential-bearing, root, or cross-origin public load targets before any staging identity is used. The workflow signs in dedicated customer, vendor, and admin staging identities through Firebase at run time instead of depending on manually copied expiring ID tokens. It also sends 40 bounded seller-list requests at concurrency 4 to `/api/v2/vendor/orders?limit=1`, deriving the origin from the existing `API_PUBLIC_URL` staging variable and reusing the masked fresh vendor token. The load report records `authenticated: true` but never the token or URL query, and requires zero failures plus p95 at or below 2,500 ms.

## Latest local evidence

Recorded 2026-08-02 for the Phase 10/handover baseline:

- Type-check passed.
- Full suite passed: 30 tests, including PostgreSQL constraints/concurrency, payment replay, delivery idempotency/restart, finance invariants, engagement controls, and migration determinism.
- Phase 10 focused suite passed: readiness degradation, non-root/container CI contracts, Expo/EAS release profiles, and blocked-gate truthfulness.
- Expo SDK 57 web production export passed.
- Secret scan passed.
- This historical baseline is superseded by the current audit evidence below; dependency status must always be taken from a fresh `npm run release:check`.

Docker is unavailable on the current workstation, so container build evidence must come from GitHub CI. Load/security, managed restore, production-scale migration, and Android/iOS device E2E evidence are still required and must be attached to the release record.

## 2026-10-21 local release evidence

- Full monorepo build and test gate passed, including 269 API tests, 441 mobile tests, 36 worker tests, 71 contract tests, 28 domain tests, migration tests, PostgreSQL-backed integration tests, and 102 repository acceptance checks.
- Expo SDK dependency alignment passed and Expo Doctor reported 21/21 checks passing.
- Expo web production export completed successfully. The missing Sentry organization/project warning remains an external production configuration gate.
- Public catalog load smoke passed against the configured database through the local API: 100 requests, concurrency 10, zero failures, 717.43 requests/second, 11 ms p50, 28 ms p95, 29 ms p99, and 32 ms maximum latency after five warm-up requests.
- Authenticated local browser verification covered the seller dashboard at 360px and desktop widths plus seller products and notifications. A bounded vendor-workspace load check used a short-lived local Firebase token entirely through process memory: 20 requests, concurrency 2, zero failures, 0.81 requests/second, 1,956 ms p50, 4,184 ms p95, and 4,185 ms maximum latency. The endpoint already runs its independent workspace reads concurrently, so production hosting must be colocated with PostgreSQL and the same authenticated check must pass against staging before release.
- `npm audit --omit=dev` currently reports 16 high and 3 moderate findings in the Expo/React Native dependency graph. Expo's compatibility checks are green, but npm proposes incompatible major downgrades; do not use `npm audit fix --force`. Production approval remains blocked until a compatible upstream SDK resolution or documented security acceptance is available.

## 2026-10-23 supply-chain hardening regression

- Full `npm test` passed after release-readiness evidence, mandatory authenticated staging smoke, deployment guards, immutable image manifests, least-privilege workflow permissions, Dependabot/CODEOWNERS controls, security reporting and commit-pinned GitHub Actions were integrated.
- The run passed 1,007 tests: 285 API, 450 mobile, 41 worker, 10 config, 75 contracts, 28 domain, 2 migration, 2 observability and 114 repository acceptance/integration checks.
- PostgreSQL-backed migration, constraint, concurrency, inventory reservation, checkout idempotency, payment replay, delivery restart, finance, chat, notifications, loyalty, restore reconciliation and wishlist migration checks all executed successfully.
- This local result verifies repository regression only. It does not replace remote GitHub Actions, container-build, staging provider/load, restore-drill or real-device evidence, and it does not clear the current dependency or decision gates.
- `.maestro/*.yaml` provides credential-safe Android staging smokes for customer, seller, and admin protected navigation. A passing source contract proves the flows exist; only a recorded run on the staged binary counts as device evidence.

## 2026-09-01 business-rule evidence

- Full `npm test` repository gate passed, including API, worker, contracts, domain, migration, PostgreSQL constraints/concurrency, and reference-parity source contracts.
- Lint, TypeScript build/type-check, secret scan, and Expo web production export passed.
- Firebase Auth emulator token verification passed; seeded customer/vendor/admin database role smoke passed.
- Live local API `/health` and `/ready` checks passed; category/product catalog returned seeded data.
- Concurrent load smoke passed with 100 requests at concurrency 10, zero failures, and 38 ms local p95.
- Release readiness remains truthfully blocked on 27 external/business decisions; no code gate overrides this production block.
