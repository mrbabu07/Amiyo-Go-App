# Amiyo-Go Handover Package

This index is the operator and maintainer entry point for the production rebuild. Phase implementation is complete through the Phase 10 foundation, but production approval remains blocked by the items in `docs/decisions-needed.md`.

## Architecture and contracts

- Architecture decisions: `docs/adr/`
- Generated OpenAPI document: `docs/api/openapi.json`
- API contract and client instructions: `docs/api/client-generation.md`
- Shared runtime contracts: `packages/contracts/src/`
- Domain rules and state machines: `packages/domain/src/`
- Prisma schema and migrations: `prisma/schema.prisma` and `prisma/migrations/`

## Setup and configuration

- Local installation and service startup: `README.md`
- Environment variable contract: `docs/environment-reference.md`
- Firebase Auth setup: `docs/runbooks/firebase-auth-setup.md`
- Safe placeholders: `.env.example`, `apps/api/.env.example`, `apps/worker/.env.example`, and `apps/mobile/.env.example`
- CI and immutable image release flow: `.github/workflows/ci.yml`, `.github/workflows/deploy.yml`, and `docs/runbooks/release.md`

## Operations

- Incident response: `docs/runbooks/incident-response.md`
- PostgreSQL backup/restore drill: `docs/runbooks/backup-restore.md`
- Queue and outbox recovery: `docs/runbooks/queue-operations.md`
- Payment webhook incidents: `docs/runbooks/payment-operations.md`
- Delivery dispatch/callback incidents: `docs/runbooks/delivery-operations.md`
- Data cutover and rollback: `docs/migration/cutover-runbook.md`

## Migration and evidence

- Legacy mapping: `docs/migration/legacy-to-postgres-mapping.md`
- Synthetic rehearsal evidence: `docs/migration/rehearsals/`
- Reconciliation approval template: `docs/migration/reconciliation-approval-template.md`
- Test strategy and latest local evidence: `docs/test-strategy-and-evidence.md`
- Store build/submission guide: `docs/store-release-guide.md`
- Known limitations and technical debt: `docs/known-limitations.md`

## Ownership transfer checklist

1. Resolve every `TBD` and `BLOCKED` row in `docs/decisions-needed.md` with named approvers.
2. Configure separate staging/production secrets and protected GitHub environments.
3. Run CI, container deployment, managed restore drill, production-scale migration rehearsals, staging load/security tests, and real-device E2E.
4. Attach evidence and approvals to the release record; do not replace missing external evidence with local fixtures.
5. Transfer provider, store, DNS, monitoring, and incident-contact ownership without placing credentials in Git.
