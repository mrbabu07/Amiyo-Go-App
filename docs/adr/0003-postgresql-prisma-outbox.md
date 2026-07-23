# ADR 0003: PostgreSQL, Prisma, and Transactional Outbox

Status: Proposed

## Context

The existing MongoDB models contain embedded data, duplicated state, flexible dynamic attributes, and controller-driven status changes. Commerce correctness requires strong constraints, transactions, and idempotency.

## Decision

Use PostgreSQL 16+ with Prisma. Use UUID primary keys, `legacy_id` columns during migration, integer minor units for money, UTC timestamps, constraints, unique indexes, and explicit transactions for high-risk flows.

Use a transactional outbox table for side effects. READY_TO_SHIP creates exactly one outbox event with idempotency key `delivery-create:<orderId>`.

## Consequences

- Checkout, inventory, payment, refund, payout, and delivery dispatch become transaction-safe.
- Workers can retry external side effects without duplicating orders, payments, or delivery jobs.
- Prisma `migrate deploy` must run through CI for staging/production; do not use production `db push`.
