# Phase 10: Production Hardening and Release

## Acceptance gate

The complete production Definition of Done must pass with staging/provider/device evidence and named approvals.

## Delivered foundation

- Truthful API liveness/readiness behavior and graceful shutdown for container orchestration.
- Pull-request CI for build, lint, strict type-check, tests, generated OpenAPI drift, secret scan, high dependency findings, release checks, mobile web export, and API/worker container builds.
- Manually approved release workflow that publishes immutable SHA-tagged images and runs Prisma deploy migrations with encrypted secrets; provider-specific deployment remains pending a target decision.
- Non-root API and worker container definitions, Expo development/staging/production build profiles, configurable load smoke tooling, and release-readiness reporting.
- Zod 4.6.7 and `@asteasolutions/zod-to-openapi` 9.1.0 remediate the application/runtime Zod advisory; shared contracts bootstrap one OpenAPI-enabled Zod instance and the complete API, worker, mobile, OpenAPI and regression suites pass. API and worker production dependency audits report zero findings.
- Expo SDK 58 dependency alignment and Expo compatibility checks pass, but the 2026-10-24 complete-graph audit still reports five high findings inherited through the Expo CLI/build graph (`expo`, `@expo/cli`, `@expo/code-signing-certificates`, `node-forge`, and the CLI's nested Zod 3). The installed Expo 58 CLI resolves the latest published `node-forge` 1.4.0 and Zod 3.25.76, which remain inside their advisory ranges; npm offers only an incompatible Expo 44 downgrade. The release audit therefore stays blocking until Expo publishes compatible remediation or a named security owner accepts the build-time risk with compensating controls.
- Incident response, backup/restore drill, release, migration cutover, and rollback procedures.
- Authenticated delivery queue inspection/retry APIs reset the original transactional outbox event and retry the retained stable BullMQ job without creating another provider identity.
- Production deploy preflight materializes Android, iOS and finance evidence JSON from protected environment secrets, validates each against the exact release commit and rejects missing, stale, failed or malformed evidence without exposing provider references or credentials in the readiness report.

## Gate status: blocked

Amiyo-Go is **not production-ready**. Deployment targets, release-one market boundaries, package identity, authentication, payment methods, greenfield launch policy, and the technical retention baseline are selected. Promotion still requires the unresolved named data-retention approval, compatible resolution or expiring approval of the current Expo build-tool advisories, production secrets/provider provisioning, store metadata, managed backup restore evidence, staging finance/load/security evidence, and real Android/iOS accessibility/offline/E2E evidence.

The local automation validates the release foundation only. It does not claim external systems, store binaries, backups, alerts, or production migration rehearsals were verified.

The API/worker Dockerfiles are covered by static tests and CI build jobs. Docker is not installed in the current workstation environment, so local image-build evidence is not claimed.

## Rollback

Revert this focused commit to remove the new automation. Existing product/domain data is unaffected. For deployed artifacts, follow `docs/runbooks/release.md`; for migration issues, follow `docs/migration/cutover-runbook.md`.
