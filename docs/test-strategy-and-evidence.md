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
