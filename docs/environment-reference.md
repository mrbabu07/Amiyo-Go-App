# Environment Reference

Real values belong in local ignored files or encrypted environment managers. `EXPO_PUBLIC_*` values are public mobile configuration and must never contain server secrets.

## Shared API and worker

| Variable | Purpose | Requirement |
|---|---|---|
| `NODE_ENV` | Runtime mode | `staging` or `production` outside local development |
| `API_PUBLIC_URL` | Canonical HTTPS API origin | Required |
| `DATABASE_URL` | Pooled PostgreSQL runtime connection | Required; secret |
| `DIRECT_URL` | Direct PostgreSQL migration connection | CI migration only; secret |
| `REDIS_URL` | TLS Redis connection | Required for worker; secret |
| `LOG_LEVEL` | Structured log threshold | Default `info` |
| `SENTRY_DSN` | Server error reporting destination | Required before release |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | Trace/metric exporter | Required before release |

## API

| Variable | Purpose | Requirement |
|---|---|---|
| `PORT` | HTTP listener port | Default `4000` |
| `CORS_ORIGINS` | Comma-separated approved origins | Explicit staging/production values |
| `TRUST_PROXY_HOPS` | Trusted reverse-proxy count | Match deployment topology |
| `FIREBASE_PROJECT_ID` | Authentication project | Required for authenticated flows |
| `FIREBASE_CLIENT_EMAIL` | Firebase Admin identity | Secret |
| `FIREBASE_PRIVATE_KEY` | Firebase Admin signing key | Secret; preserve escaped newlines |
| `PAYMENT_WEBHOOK_SECRET` | HMAC webhook verification | Required for online payments; secret |
| `AMIYO_DELIVERY_CALLBACK_API_SECRET` | Delivery callback API-key verification | Required; secret |
| `AMIYO_DELIVERY_CALLBACK_SECRET` | Delivery callback HMAC verification | Required; secret |
| `AMIYO_DELIVERY_CALLBACK_TOLERANCE_SECONDS` | Replay time window | Default `300` |
| `OPS_API_KEY` | Additional operations protection | Secret; authorization remains mandatory |

Object storage, email, SMS, payment-provider, delivery-provider, and public asset variables are enumerated in `.env.example`. Their providers and retention policies remain approval blockers.

## Worker

| Variable | Purpose | Requirement |
|---|---|---|
| `WORKER_CONCURRENCY` | Delivery queue concurrency | Positive integer; default `5` |
| `AMIYO_DELIVERY_API_URL` | Provider endpoint | HTTPS staging/production endpoint |
| `AMIYO_DELIVERY_INTEGRATION_TOKEN` | Provider bearer credential | Secret |
| `AMIYO_DELIVERY_WEBHOOK_SECRET` | Outbound request signing | Secret |
| `AMIYO_DELIVERY_TIMEOUT_MS` | Provider timeout | Default `12000` |

## Mobile public configuration

The complete list is in `apps/mobile/.env.example`. At minimum set `EXPO_PUBLIC_API_URL` and approved Firebase public identifiers. Restrict Firebase and maps keys by application/package identity even though they are public.
