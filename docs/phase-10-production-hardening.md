# Phase 10: Production Hardening and Release

## Acceptance gate

The complete production Definition of Done must pass with staging/provider/device evidence and named approvals.

## Delivered foundation

- Truthful API liveness/readiness behavior and graceful shutdown for container orchestration.
- Pull-request CI for build, lint, strict type-check, tests, generated OpenAPI drift, secret scan, high dependency findings, release checks, mobile web export, and API/worker container builds.
- Manually approved release workflow that publishes immutable SHA-tagged images and runs Prisma deploy migrations with encrypted secrets; provider-specific deployment remains pending a target decision.
- Non-root API and worker container definitions, Expo development/staging/production build profiles, configurable load smoke tooling, and release-readiness reporting.
- Expo SDK 57 dependency alignment removes all known critical/high npm audit findings; remaining moderate transitive tooling findings stay visible in the audit report.
- Incident response, backup/restore drill, release, migration cutover, and rollback procedures.

## Gate status: blocked

Amiyo-Go is **not production-ready**. Deployment providers, final app identity/branding, store accounts and metadata, privacy disclosures, retention rules, monitoring projects, production secrets, production-scale migration approvals, managed backup restore evidence, staging load/security results, and real Android/iOS accessibility/offline/E2E evidence were not supplied.

The local automation validates the release foundation only. It does not claim external systems, store binaries, backups, alerts, or production migration rehearsals were verified.

The API/worker Dockerfiles are covered by static tests and CI build jobs. Docker is not installed in the current workstation environment, so local image-build evidence is not claimed.

## Rollback

Revert this focused commit to remove the new automation. Existing product/domain data is unaffected. For deployed artifacts, follow `docs/runbooks/release.md`; for migration issues, follow `docs/migration/cutover-runbook.md`.
