# Release Runbook

## Staging

`render.yaml` is the production-shaped Render Blueprint for the API and continuous background worker. It uses Singapore, CI-gated auto-deploys, API readiness checks and an API pre-deploy migration. Render does not provide a free background-worker plan, so this Blueprint intentionally uses the smallest paid compute plan for both services; use it only after accepting the account cost. Every deployment-specific value remains a Dashboard prompt or generated secret.

1. Confirm CI, dependency audit, secret scan, OpenAPI compatibility, container builds, and mobile export pass for the commit SHA.
   The manual deploy workflow permits production dispatch only from `main`, records `npm run release:check` for staging, and enforces it with `REQUIRE_PRODUCTION_READY=true` for production before publishing images or applying migrations. It then runs `npm run release:deploy-env` against the selected protected GitHub Environment. Missing decisions, blocking dependency findings, partial/local-only/non-TLS/emulator configuration, or production sandbox settings fail production preflight without printing secret values.
2. Build immutable API and worker images and apply `prisma migrate deploy` with the staging direct URL. Both PostgreSQL URLs must explicitly use `sslmode=require`, `verify-ca`, or `verify-full`; both services fail startup when deployed shared safety rules are incomplete.
3. Deploy both images, verify API `/health` and `/ready` on its service port plus worker `/health` and `/ready` on `WORKER_HEALTH_PORT`, then run smoke, payment replay, READY_TO_SHIP deduplication, queue retry, and role authorization tests. API readiness must fail when PostgreSQL or the shared rate-limit Redis store is unavailable; worker readiness must fail when PostgreSQL, Redis, or any queue processor is unavailable.
   Dispatch `Staging Smoke`; authenticated role and seller-load verification is mandatory and cannot be skipped by workflow input.
4. Run `LOAD_TARGET_URL=<staging endpoint> LOAD_REQUESTS=1000 LOAD_CONCURRENCY=25 LOAD_MAX_P95_MS=1500 LOAD_MAX_FAILURE_RATE=0 LOAD_REPORT_PATH=load-smoke.json npm run smoke:load` and retain the immutable JSON result. Use a new report path for every run; the command refuses to overwrite prior evidence.
5. Load the EAS profile environment, run `npm run release:mobile-env`, then build Expo preview binaries from `apps/mobile/eas.json`; verify critical flows, offline/error states, deep links, accessibility, and crash reporting on Android and iOS devices.

## Production

1. Require named engineering, operations, finance, security/privacy, and product approvals.
2. Promote the tested commit SHA and artifacts; do not rebuild mutable release artifacts.
3. Apply forward-compatible migrations before traffic shift and monitor readiness, errors, latency, queues, payments, delivery, and mobile crashes.
4. Roll back application images by SHA on failure. Stop traffic and follow the migration rollback runbook if data reconciliation fails.
5. Record deployment timestamps, artifact digests, migration IDs, smoke evidence, and approvers.

API shutdown drains HTTP connections, closes the shared Redis limiter client, then disconnects PostgreSQL. Treat shutdown errors as a failed rollout rather than leaving a replica in service.

Store submission remains blocked until final branding, privacy URLs/disclosures, signing accounts, screenshots, and package identifiers are approved.

## Automated release gate

Run `npm run release:check` to verify required release artifacts, unresolved product/operations decisions, and runtime dependency advisories. High or critical dependency findings keep the release blocked. Set `REQUIRE_PRODUCTION_READY=true` in CI so unresolved decisions, an unavailable audit, or blocking advisories fail the job. Never use `npm audit fix --force` to downgrade the Expo/React Native stack; resolve findings with a compatible SDK upgrade and rerun Expo Doctor and the full regression suite.
