# Deployment Targets

Status: Approved release-one architecture  
Effective: 2026-10-24

This document selects the production providers used by Amiyo-Go. Selection does not prove that an external account, credential, deployment, backup, or store release is complete; those remain release-evidence gates.

| Capability | Selected target | Repository evidence |
|---|---|---|
| API | Render Web Service, Singapore | `render.yaml`, `apps/api/Dockerfile`, `/health`, `/ready` |
| Background jobs | Render Background Worker, Singapore | `render.yaml`, `apps/worker/Dockerfile`, worker health server |
| PostgreSQL | Neon PostgreSQL | pooled `DATABASE_URL`, direct `DIRECT_URL`, TLS validation and Prisma migrations |
| Redis | Render Key Value | TLS `rediss://` validation, BullMQ queues and shared rate limiting |
| Android/iOS builds | Expo EAS | `apps/mobile/eas.json`, fixed package and bundle identifiers |
| Authentication and object storage | Firebase Auth and Firebase Storage | server Admin validation, mobile public configuration and signed upload flow |
| Mobile error monitoring | Sentry | production mobile builds require `EXPO_PUBLIC_SENTRY_DSN` |
| Server operational monitoring | Render logs, health checks and alerts | structured Pino logs, API readiness and worker health endpoints |
| Container registry | GitHub Container Registry | immutable SHA-tagged API/worker images with SBOM and provenance |

## Network and region policy

- API, worker, Redis and the selected Neon production region must be colocated as closely as the providers allow; the release-one application region is Singapore.
- PostgreSQL must use TLS with `sslmode=require`, `verify-ca`, or `verify-full`; Redis must use `rediss://`.
- Public API, application, storage and provider endpoints must use HTTPS.
- Production secrets belong only in Render, GitHub Environment, EAS or provider secret stores.

## Promotion evidence

Production promotion still requires staging smoke reports, Android and iOS device evidence, payment/refund evidence, a restore drill, configured alerts, provider credentials, Firebase IAM/CORS and mobile-store signing ownership. These are deployment acceptance requirements, not unresolved provider choices.

OpenTelemetry export may be added later for richer traces and metrics. It is not a release-one runtime dependency; structured logs, health endpoints, Render alerts and mobile Sentry are the approved baseline.
