# Environment Reference

Real values belong in local ignored files or encrypted environment managers. `EXPO_PUBLIC_*` values are public mobile configuration and must never contain server secrets.

## Shared API and worker

| Variable | Purpose | Requirement |
|---|---|---|
| `NODE_ENV` | Runtime mode | `staging` or `production` outside local development |
| `API_PUBLIC_URL` | Canonical HTTPS API origin | Required |
| `APP_PUBLIC_URL` | Customer app origin used after hosted payment redirects | Required for online payments |
| `DATABASE_URL` | Pooled PostgreSQL runtime connection | Required; secret; `sslmode=require`, `verify-ca`, or `verify-full` in staging/production |
| `DIRECT_URL` | Direct PostgreSQL migration connection | CI migration only; secret; TLS mode required in staging/production |
| `REDIS_URL` | TLS Redis connection | Required for API shared rate limits and worker queues; secret |
| `LOG_LEVEL` | Structured log threshold | Default `info` |
| `SENTRY_DSN` | Reserved server error-reporting destination | Optional; mobile Sentry uses `EXPO_PUBLIC_SENTRY_DSN` |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | Reserved trace/metric exporter | Optional post-release enhancement; not consumed by the release-one runtime |

## API

| Variable | Purpose | Requirement |
|---|---|---|
| `PORT` | HTTP listener port | Default `4000` |
| `CORS_ORIGINS` | Comma-separated approved origins | Explicit staging/production values |
| `TRUST_PROXY_HOPS` | Trusted reverse-proxy count | Match deployment topology |
| `HTTP_REQUEST_TIMEOUT_MS` | Maximum time for one API request | Default `30000` |
| `HTTP_HEADERS_TIMEOUT_MS` | Maximum time to receive headers; cannot exceed request timeout | Default `15000` |
| `HTTP_KEEP_ALIVE_TIMEOUT_MS` | Idle keep-alive connection timeout | Default `5000` |
| `HTTP_MAX_REQUESTS_PER_SOCKET` | Maximum requests served by one socket | Default `1000` |
| `FIREBASE_PROJECT_ID` | Authentication project | Required for authenticated flows |
| `FIREBASE_CLIENT_EMAIL` | Firebase Admin identity | Secret |
| `FIREBASE_PRIVATE_KEY` | Firebase Admin signing key | Secret; preserve escaped newlines |
| `FIREBASE_USE_APPLICATION_DEFAULT` | Select workload identity/ADC instead of key material | Explicit `true` only on configured hosts |
| `FIREBASE_AUTH_EMULATOR_HOST` | Local Auth emulator endpoint | Development/test only; forbidden in production |
| `PAYMENT_WEBHOOK_SECRET` | HMAC webhook verification | Required for online payments; secret |
| `SSLCOMMERZ_STORE_ID` | SSLCommerz merchant store ID | Secret deployment setting |
| `SSLCOMMERZ_STORE_PASSWORD` | SSLCommerz merchant store password | Secret deployment setting |
| `SSLCOMMERZ_SANDBOX` | Select sandbox or live SSLCommerz endpoints | `true` outside production; `false` in production |
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
| `AMIYO_DELIVERY_INTEGRATION_TOKEN` | Provider bearer credential | Secret; configure together with the provider endpoint |
| `AMIYO_DELIVERY_WEBHOOK_SECRET` | Outbound request signing | Secret |
| `AMIYO_DELIVERY_TIMEOUT_MS` | Provider timeout | Default `12000` |
| `EMAIL_PROVIDER`, `EMAIL_PROVIDER_TOKEN`, `EMAIL_FROM` | Transactional email provider configuration | Configure all three together or leave all disabled |

The worker applies the same deployed-environment controls as the API: Firebase Admin must be configured, the emulator is forbidden in production, Redis and PostgreSQL must use TLS, public URLs must use HTTPS, CORS must be explicit, and production SSLCommerz cannot remain in sandbox mode.

## Mobile public configuration

The complete list is in `apps/mobile/.env.example`. At minimum set `EXPO_PUBLIC_API_URL` and approved Firebase public identifiers. Restrict Firebase and maps keys by application/package identity even though they are public.
