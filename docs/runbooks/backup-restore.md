# PostgreSQL Backup and Restore Drill

## Preconditions

- Use an isolated restore environment with no production traffic or provider callbacks.
- Record provider backup/PITR identifiers and the target UTC recovery time without printing credentials.
- Confirm object-storage and Redis recovery expectations separately; Redis is not the transactional source of truth.

## Drill

1. Select a backup and create a new isolated PostgreSQL restore target through the managed provider.
2. Configure temporary `DATABASE_URL` and `DIRECT_URL` in the encrypted staging environment.
3. Run `npm run prisma:migrate:deploy`, then set `RESTORE_DATABASE_URL`, `RESTORE_VERIFICATION_ACK=isolated-non-production`, and a new `RESTORE_REPORT_PATH`.
4. Run `npm run restore:verify`. It refuses the active `DATABASE_URL`, requires PostgreSQL TLS, executes only a fixed read-only reconciliation query, preserves bigint totals as strings, refuses to overwrite evidence, and fails on financial/inventory/idempotency violations.
   For repeatable hosted evidence, configure the GitHub `recovery-drill` environment with protected `ACTIVE_DATABASE_URL` and `RESTORE_DATABASE_URL` secrets, then manually dispatch **Isolated Restore Drill** with the provider recovery-point identifier. The workflow never runs migrations against the restored snapshot and retains its JSON evidence for 90 days.
5. Review its row counts, order/payment/refund totals, derived vendor-ledger balance, inventory/payment/order/ledger invariants, unique provider/outbox identifiers, and pending/failed outbox counts against the source backup evidence.
6. Start one API instance against the restored database and verify `/health`, `/ready`, authentication, catalog, order lookup, and protected operations access.
7. Record measured RPO/RTO, checks, approvers, failures, and cleanup evidence.
8. Destroy the isolated target only after approval and according to provider retention policy.

The production gate requires provider evidence for a successful restore within RPO 15 minutes and RTO 60 minutes. This repository cannot manufacture that evidence locally.
