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

## Latest local evidence

Recorded 2026-08-02 for the Phase 10/handover baseline:

- Type-check passed.
- Full suite passed: 30 tests, including PostgreSQL constraints/concurrency, payment replay, delivery idempotency/restart, finance invariants, engagement controls, and migration determinism.
- Phase 10 focused suite passed: readiness degradation, non-root/container CI contracts, Expo/EAS release profiles, and blocked-gate truthfulness.
- Expo SDK 57 web production export passed.
- Secret scan passed.
- npm audit reported no critical/high findings; moderate transitive tooling findings remain visible.

Docker is unavailable on the current workstation, so container build evidence must come from GitHub CI. Load/security, managed restore, production-scale migration, and Android/iOS device E2E evidence are still required and must be attached to the release record.

## 2026-09-01 business-rule evidence

- Full `npm test` repository gate passed, including API, worker, contracts, domain, migration, PostgreSQL constraints/concurrency, and reference-parity source contracts.
- Lint, TypeScript build/type-check, secret scan, and Expo web production export passed.
- Firebase Auth emulator token verification passed; seeded customer/vendor/admin database role smoke passed.
- Live local API `/health` and `/ready` checks passed; category/product catalog returned seeded data.
- Concurrent load smoke passed with 100 requests at concurrency 10, zero failures, and 38 ms local p95.
- Release readiness remains truthfully blocked on 27 external/business decisions; no code gate overrides this production block.
