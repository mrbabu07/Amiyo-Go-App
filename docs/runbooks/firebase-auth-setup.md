# Firebase Authentication Setup

## Console

1. Register separate web, Android, and iOS apps in the approved Firebase project.
2. Enable Email/Password, Google, and Anonymous sign-in. Anonymous identities power passwordless guest carts and checkout while the API still verifies every request.
3. Add staging/production web domains to Authorized Domains and restrict public API keys by app/domain where supported.
4. Configure password/OTP abuse controls, templates, quotas, and monitoring before release.

## Mobile

Set the `EXPO_PUBLIC_FIREBASE_*` values in ignored local files and EAS environment variables. Analytics remains disabled unless consent policy is approved and `EXPO_PUBLIC_FIREBASE_ANALYTICS_ENABLED=true` is explicitly configured.

## API

Choose exactly one server mode:

- Workload identity/application-default credentials: set `FIREBASE_PROJECT_ID` and `FIREBASE_USE_APPLICATION_DEFAULT=true`.
- Encrypted service-account values: set `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, and `FIREBASE_PRIVATE_KEY` in the deployment secret manager.
- Local emulator only: set `FIREBASE_PROJECT_ID` and `FIREBASE_AUTH_EMULATOR_HOST`. Emulator mode is rejected in production.

## Local emulator workflow

1. Run `docker compose up -d` for PostgreSQL and Redis.
2. Run `npm run dev:firebase`; Auth Emulator UI is available at `http://127.0.0.1:4001`.
3. Run `npm run prisma:migrate:dev`, then `npm run dev:api` and `npm run dev:mobile -- --web`.
4. Copy `apps/api/.env.example` to ignored `apps/api/.env`, set the local PostgreSQL/Redis URLs, `FIREBASE_PROJECT_ID=amiyo-app`, and `FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099`. The existing ignored mobile env points the client to `http://127.0.0.1:9099`.

Run `npm run test:firebase-auth-e2e` to start an isolated Auth Emulator, create a temporary email/password identity, verify its ID token through the API's Firebase Admin adapter, and confirm invalid tokens are rejected. This check does not require PostgreSQL, Redis, Firebase login, or service-account credentials.

Guest checkout uses a Firebase anonymous identity, synchronizes the normal `CUSTOMER` authorization scope, and stores its cart/order against that protected identity. Enable Anonymous sign-in in every environment where `/checkout/guest` is available; otherwise the client shows a configuration error instead of opening an unauthenticated order endpoint.

For local role testing, keep `npm run dev:firebase` running and execute `npm run demo:setup` in another terminal. This applies committed migrations, seeds categories/products, and creates three Auth Emulator identities that match the PostgreSQL roles:

| Role | Email | Password |
| --- | --- | --- |
| Customer | `customer@amiyo.test` | `AmiyoDemo123!` |
| Vendor owner | `vendor@amiyo.test` | `AmiyoDemo123!` |
| Super admin | `admin@amiyo.test` | `AmiyoDemo123!` |

These accounts are local emulator fixtures only and must never be created in a shared or production Firebase project.

`npm run dev` starts Firebase Auth, API, and Expo together. When Firebase shuts down normally, local emulator accounts are exported to ignored `.firebase-data` and restored on the next run.

For a physical phone, replace the mobile emulator URL host with the computer's LAN IP and allow the port through the local firewall. Never expose the emulator to an untrusted network.

Never commit a service-account JSON file or private key. Restart the API after rotating credentials and verify login, token expiry/revocation, logout, and role synchronization.

At startup the API logs only the selected Firebase Admin mode. It never logs project credentials or key material. An unconfigured development API remains available for public routes, but protected routes return `AUTH_PROVIDER_NOT_CONFIGURED`; staging/production environment validation fails before listening.
