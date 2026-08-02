# PostgreSQL Backup and Restore Drill

## Preconditions

- Use an isolated restore environment with no production traffic or provider callbacks.
- Record provider backup/PITR identifiers and the target UTC recovery time without printing credentials.
- Confirm object-storage and Redis recovery expectations separately; Redis is not the transactional source of truth.

## Drill

1. Select a backup and create a new isolated PostgreSQL restore target through the managed provider.
2. Configure temporary `DATABASE_URL` and `DIRECT_URL` in the encrypted staging environment.
3. Run `npm run prisma:migrate:deploy`, then read-only reconciliation and integrity queries.
4. Verify row counts, order/payment totals, vendor ledger balance derivation, inventory non-negativity, unique external IDs, and outbox state.
5. Start one API instance against the restored database and verify `/health`, `/ready`, authentication, catalog, order lookup, and protected operations access.
6. Record measured RPO/RTO, checks, approvers, failures, and cleanup evidence.
7. Destroy the isolated target only after approval and according to provider retention policy.

The production gate requires provider evidence for a successful restore within RPO 15 minutes and RTO 60 minutes. This repository cannot manufacture that evidence locally.
