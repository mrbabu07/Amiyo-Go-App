# Phase 9: Data Migration

## Delivered foundation

- Deterministic, repeatable Mongo-export transformer for users, categories, vendors/shops, products/default variants/inventory, split orders/items, and payments.
- SHA-256 source manifests, deterministic ID maps, rejected-row NDJSON, load plans, and count/money reconciliation reports.
- Guarded PostgreSQL loader that refuses writes without an explicit reviewed-plan confirmation and rejects plans with mapping failures or digest changes.
- Sanitized synthetic fixture and two independent dry-run outputs with identical digest and zero rejects.
- Legacy mapping, production rehearsal, cutover, rollback, and reconciliation approval runbooks.

## Synthetic rehearsal result

Both fixture runs produced digest `d8be14c26d89df9363fc98010b7b4dcaa21a56007a7d797e72b343599c91e09e`, 14 target rows, zero rejects, and matching order/payment totals of 25,100 BDT minor units.

## Gate status: blocked

The Phase 9 production gate is **not passed**. Two production-scale exports, staging targets, production-shaped collection samples, and signed finance/operations/engineering reconciliation approvals were not provided. Synthetic fixture runs validate determinism and tooling only; they are not represented as production rehearsals.
