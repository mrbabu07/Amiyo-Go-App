# Release Runbook

## Staging

1. Confirm CI, dependency audit, secret scan, OpenAPI compatibility, container builds, and mobile export pass for the commit SHA.
2. Build immutable API and worker images and apply `prisma migrate deploy` with the staging direct URL.
3. Deploy both images, verify `/health` and `/ready`, then run smoke, payment replay, READY_TO_SHIP deduplication, queue retry, and role authorization tests.
4. Run `LOAD_TARGET_URL=<staging endpoint> npm run smoke:load` and retain the result.
5. Build Expo preview binaries from `apps/mobile/eas.json`; verify critical flows, offline/error states, deep links, accessibility, and crash reporting on Android and iOS devices.

## Production

1. Require named engineering, operations, finance, security/privacy, and product approvals.
2. Promote the tested commit SHA and artifacts; do not rebuild mutable release artifacts.
3. Apply forward-compatible migrations before traffic shift and monitor readiness, errors, latency, queues, payments, delivery, and mobile crashes.
4. Roll back application images by SHA on failure. Stop traffic and follow the migration rollback runbook if data reconciliation fails.
5. Record deployment timestamps, artifact digests, migration IDs, smoke evidence, and approvers.

Store submission remains blocked until final branding, privacy URLs/disclosures, signing accounts, screenshots, and package identifiers are approved.
