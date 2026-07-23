# ADR 0001: Modular Monorepo Foundation

Status: Proposed

## Context

The legacy system is split into `Client/` and `Server/`, with shared business rules duplicated across web UI, controllers, services, and tests. The rebuild needs React Native, API, worker, contracts, domain rules, Prisma, migration tooling, CI, and operations docs.

## Decision

Use a TypeScript workspace monorepo:

```text
apps/mobile
apps/api
apps/worker
packages/contracts
packages/domain
packages/config
packages/observability
packages/test-factories
prisma
migration
docs
```

## Consequences

- Mobile, API, and worker share DTOs, validation, state machines, and env parsing.
- Controllers stay thin because domain/application services own transitions and side effects.
- Workspace scripts can enforce strict TypeScript, tests, linting, Prisma validation, and secret scans from one root.
- Initial setup is heavier than a single app but safer for production commerce.
