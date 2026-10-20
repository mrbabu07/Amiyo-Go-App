# Render Deployment

`render.yaml` provisions the production-shaped API and background worker from this repository. Both services build from their dedicated Dockerfiles in Singapore, deploy only after linked CI checks pass, and use graceful shutdown windows. The API runs `/ready` health checks and applies Prisma migrations before each release.

## Before Blueprint Creation

1. Rotate every value previously copied into chat, local notes, shell history, or unencrypted files.
2. Provision production PostgreSQL and Redis close to Singapore. Both URLs must use TLS; PostgreSQL requires `sslmode=require`, `verify-ca`, or `verify-full`, and Redis requires `rediss://`.
3. Create Firebase Admin credentials, production Storage rules/bucket, approved web domains, and native app registrations.
4. Confirm SSLCommerz live access, callback domains, refund access and finance ownership.
5. Accept Render billing. Render does not offer a free background-worker instance; the Blueprint uses the smallest paid service plan.

## Create the Blueprint

1. In Render, choose **New → Blueprint** and connect this repository.
2. Select the root `render.yaml` file and review both services before applying.
3. Supply every `sync: false` value in the Dashboard. Never paste secrets into `render.yaml` or commit `.env.render`.
4. Use the same canonical API URL, app URL, CORS allowlist, database, Redis, Firebase project and storage configuration for both services.
5. Keep `SSLCOMMERZ_SANDBOX=false` only when the supplied credentials and callback URLs are live. Use a separate staging Blueprint/environment for sandbox credentials.
6. Confirm the worker receives the API-generated `PARCEL_QR_SIGNING_SECRET` through the Blueprint service reference.
7. In the GitHub `staging` Environment, set `API_PUBLIC_URL` to the staging API origin and `LOAD_TARGET_URL` to a representative public catalog endpoint on that same origin.

## Acceptance

1. Confirm the API pre-deploy migration succeeds before the new instance starts.
2. Verify API `/health` is `200` and `/ready` is `200`; verify the worker logs its health listener and every queue processor as running.
3. Run `npm run smoke:marketplace`, `npm run smoke:authenticated`, and bounded public/authenticated `npm run smoke:load` checks against staging.
   The manual **Staging Smoke** workflow automates the public contract and bounded catalog checks and retains both JSON reports for 30 days. Authenticated role journeys still require short-lived staging identities and must not reuse emulator demo credentials.
4. Retain immutable smoke reports, deploy ID, commit SHA, migration IDs, service logs and approver names.
5. Do not promote production until payment callbacks/refunds, queues, email/push delivery, backup restore and real-device customer/vendor/admin journeys pass.

The Blueprint does not create PostgreSQL, Redis, Firebase, object storage, payment accounts, delivery accounts, monitoring projects or mobile-store credentials. Those external resources remain explicit release gates.
