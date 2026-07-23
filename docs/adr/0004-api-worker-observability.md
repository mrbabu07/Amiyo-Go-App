# ADR 0004: API, Worker, and Observability Boundaries

Status: Proposed

## Context

The legacy API initializes queues and cron-like tasks inside the server runtime. Production requires stateless API instances and independently deployable background workers.

## Decision

Split runtime responsibilities:

- `apps/api`: Express TypeScript HTTP API, auth, request validation, transactions, outbox writes, health/readiness.
- `apps/worker`: BullMQ workers/schedulers for delivery, payments, notifications, media, imports, analytics, retention.
- `packages/observability`: correlation IDs, structured logs, metrics helpers, Sentry/OpenTelemetry hooks.

## Consequences

- API can scale horizontally without process-local scheduler risk.
- Worker retries and dead letters become operationally visible.
- Every external effect carries a correlation ID from mobile through API, outbox, queue, and provider callback.
