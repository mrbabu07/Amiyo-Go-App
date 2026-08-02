# Data Migration Cutover Runbook

## Preconditions

1. Rotate all previously exposed credentials and use encrypted environment storage.
2. Complete two production-scale staging rehearsals from sanitized production-shaped exports.
3. Obtain signed reconciliation approval using `reconciliation-approval-template.md`.
4. Verify PostgreSQL PITR, take a named recovery point, test restore, and confirm legacy MongoDB backup integrity.
5. Confirm maintenance window, owners, communication channel, rollback authority, and maximum write-freeze duration.

## Rehearsal

1. Export each approved MongoDB collection as a JSON array without secrets or real sensitive values in developer environments.
2. Record source row counts and SHA-256 checksums.
3. Run `npm run migration:dry-run -- <input-directory> <output-directory>`.
4. Review `rejected-rows.ndjson`; production approval requires every rejection to be dispositioned.
5. Compare source counts, target counts, order/payment totals, vendor balances, statuses, and external identifiers.
6. Apply the reviewed plan only to an isolated migrated schema using `npm run migration:apply -- --plan <load-plan> --confirm APPLY_REVIEWED_PLAN`.
7. Run API smoke/E2E tests, orphan queries, duplicate checks, and business reconciliation.

## Cutover

1. Announce maintenance and disable legacy writes while keeping reads available.
2. Capture final export/checksums and compare against the rehearsal baseline.
3. Run dry-run; stop on any undispositioned reject, checksum anomaly, count mismatch, or money mismatch.
4. Apply committed Prisma migrations to the target, then apply the reviewed migration plan.
5. Run reconciliation and obtain finance/operations/engineering approval.
6. Switch API traffic, keep MongoDB read-only, and monitor authentication, checkout, payment, order, delivery, refund, payout, and notification metrics.

## Rollback

Rollback when reconciliation is unsigned, error budgets are exceeded, financial totals differ, critical workflows fail, or the cutover exceeds the approved window.

1. Stop target writes and preserve PostgreSQL logs/data for investigation.
2. Route traffic back to the unchanged legacy deployment and re-enable MongoDB writes only after confirming no target-only accepted writes require controlled replay.
3. Do not reverse migrations or delete imported financial/audit rows in place.
4. Restore PostgreSQL to the named pre-cutover recovery point only when the database owner authorizes it.
5. Reconcile any writes accepted during the switch window, document the incident, correct the importer with a new version, and repeat both rehearsals.
