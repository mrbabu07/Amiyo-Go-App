# Phase 2: PostgreSQL Schema and Contracts

## Delivered

- A PostgreSQL-first Prisma schema covering identity, vendor operations, catalog and inventory, carts and wishlists, orders and fulfillment, payments and finance, marketing, trust, support, chat, audit, notifications, idempotency, and transactional outbox records.
- A generated baseline SQL migration with UUID keys, foreign keys, unique indexes, UTC `timestamptz`, integer minor-unit money, bounded JSON snapshots, and database-only check constraints.
- Deterministic seed data for roles, permissions, a demo vendor/shop, categories, one approved product variant, inventory, and media metadata.
- Shared Zod contracts for JSON-safe money, catalog, orders, payments, and returns.
- OpenAPI 3.1 generation and the API endpoint `GET /openapi.json`.
- Serializable Prisma transaction, catalog repository, optimistic order transition, and transactional outbox patterns.
- Parent order, vendor order, payment, and return state machines.

## Migration Strategy

Production applies committed migrations with `npm run prisma:migrate:deploy` using `DIRECT_URL`. Runtime traffic uses the pooled `DATABASE_URL`. `prisma db push` is prohibited outside disposable development databases.

The baseline is forward-only. Before production cutover, restore tests and a migration rehearsal must run against a production-sized staging copy. A failed pre-cutover migration is corrected with a new migration. A failed cutover rolls application traffic back and restores the managed PostgreSQL recovery point according to the approved runbook; destructive down SQL is not generated automatically.

## Constraint Coverage

The migration enforces non-negative money and stock, reservation ownership, cart ownership, one active/default record where required, SKU and provider-event uniqueness, payment/refund bounds, rating bounds, valid campaign windows, delivery dispatch key format, and append-only ledger idempotency keys.

Tests execute the complete migration in an isolated local PostgreSQL runtime. They verify schema creation, duplicate-default rejection, ownerless-cart rejection, idempotency collision rejection, and one-effect optimistic updates without touching a shared database.

## Commands

```text
npm run prisma:generate
npm run openapi:generate
npm run type-check
npm test
npm run secret:scan
```

Applying migrations and seed data to a shared Neon environment requires newly rotated development credentials in local environment variables. Credentials previously pasted into chat must not be reused or committed.
