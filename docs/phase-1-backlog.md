# Phase 1 Recommended Backlog

Acceptance gate: clean install, strict typecheck, tests, builds, local API/worker health, and secret scan.

## Work Items

1. Create workspace root in `Amiyo-App/` with pinned Node/package manager, `package.json`, `tsconfig.base.json`, `.gitignore`, and `.env.example` files.
2. Add `apps/mobile` Expo React Native TypeScript shell with Expo Router route groups for public/customer/vendor/admin.
3. Add `apps/api` Express TypeScript shell with health, readiness, problem responses, request IDs, CORS, Helmet, rate-limit placeholders, and env validation.
4. Add `apps/worker` TypeScript worker shell with Redis/BullMQ connection validation and graceful shutdown.
5. Add `packages/contracts` with initial health/auth/shared pagination Zod schemas.
6. Add `packages/domain` with order/vendor-order state machine placeholders and tests.
7. Add `packages/config` typed env parsing for API, worker, and mobile public config.
8. Add `packages/observability` logger/correlation helpers.
9. Add local `docker-compose.yml` for PostgreSQL and Redis development.
10. Add CI workflow for install, lint, typecheck, tests, build, Prisma validation, and secret scan.

## Modular Pattern

Each app should use feature modules:

```text
modules/
  identity/
  catalog/
  cart/
  checkout/
  orders/
  delivery/
  payments/
  vendor/
  admin/
  notifications/
  support/
```

Each module should keep routes/controllers thin and delegate rules to application/domain services.

## Risks Before Phase 1

- Real database credential must be rotated.
- Git remote currently points to the existing repository, not the requested `Amiyo-Go-App` repository.
- Existing unrelated uncommitted changes must remain unstaged unless explicitly approved.
- Business decisions in `docs/decisions-needed.md` block production-complete implementation.
