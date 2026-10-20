# Test Strategy and Evidence

## Automated gates

- `npm run type-check`: strict TypeScript project references.
- `npm test`: workspace unit tests plus PostgreSQL-backed integration and cross-module contract tests.
- `npm run openapi:generate`: generated contract drift check.
- `npm run export:web --workspace @amiyo/mobile`: Expo web production bundle.
- `npm audit --audit-level=high`: blocks critical/high dependency findings.
- `npm run secret:scan`: blocks committed secret patterns.
- `npm run release:check`: reports unresolved production decisions and missing handover artifacts.
- GitHub CI builds non-root API and worker images.

Authenticated load checks use the same `npm run smoke:load` command with `LOAD_BEARER_TOKEN` supplied only through the process environment. Reports expose only `authenticated: true`; they never include the token or URL query values. Use a short-lived staging token, never a production user credential or a token committed to a file.

## Latest local evidence

Recorded 2026-08-02 for the Phase 10/handover baseline:

- Type-check passed.
- Full suite passed: 30 tests, including PostgreSQL constraints/concurrency, payment replay, delivery idempotency/restart, finance invariants, engagement controls, and migration determinism.
- Phase 10 focused suite passed: readiness degradation, non-root/container CI contracts, Expo/EAS release profiles, and blocked-gate truthfulness.
- Expo SDK 57 web production export passed.
- Secret scan passed.
- npm audit reported no critical/high findings; moderate transitive tooling findings remain visible.

Docker is unavailable on the current workstation, so container build evidence must come from GitHub CI. Load/security, managed restore, production-scale migration, and Android/iOS device E2E evidence are still required and must be attached to the release record.

## 2026-10-21 local release evidence

- Full monorepo build and test gate passed, including 269 API tests, 441 mobile tests, 36 worker tests, 71 contract tests, 28 domain tests, migration tests, PostgreSQL-backed integration tests, and 102 repository acceptance checks.
- Expo SDK dependency alignment passed and Expo Doctor reported 21/21 checks passing.
- Expo web production export completed successfully. The missing Sentry organization/project warning remains an external production configuration gate.
- Public catalog load smoke passed against the configured database through the local API: 100 requests, concurrency 10, zero failures, 717.43 requests/second, 11 ms p50, 28 ms p95, 29 ms p99, and 32 ms maximum latency after five warm-up requests.
- Authenticated local browser verification covered the seller dashboard at 360px and desktop widths plus seller products and notifications. A bounded vendor-workspace load check used a short-lived local Firebase token entirely through process memory: 20 requests, concurrency 2, zero failures, 0.81 requests/second, 1,956 ms p50, 4,184 ms p95, and 4,185 ms maximum latency. The endpoint already runs its independent workspace reads concurrently, so production hosting must be colocated with PostgreSQL and the same authenticated check must pass against staging before release.
- `npm audit --omit=dev` reported 16 high and 12 moderate findings in the Expo/React Native dependency graph. Expo's compatibility checks are green, but npm proposes incompatible major downgrades; do not use `npm audit fix --force`. Production approval remains blocked until a compatible upstream SDK resolution or documented security acceptance is available.

## 2026-09-01 business-rule evidence

- Full `npm test` repository gate passed, including API, worker, contracts, domain, migration, PostgreSQL constraints/concurrency, and reference-parity source contracts.
- Lint, TypeScript build/type-check, secret scan, and Expo web production export passed.
- Firebase Auth emulator token verification passed; seeded customer/vendor/admin database role smoke passed.
- Live local API `/health` and `/ready` checks passed; category/product catalog returned seeded data.
- Concurrent load smoke passed with 100 requests at concurrency 10, zero failures, and 38 ms local p95.
- Release readiness remains truthfully blocked on 27 external/business decisions; no code gate overrides this production block.
