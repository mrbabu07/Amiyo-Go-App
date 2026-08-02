# Firebase Authentication Setup

## Console

1. Register separate web, Android, and iOS apps in the approved Firebase project.
2. Enable only approved sign-in methods and create non-production test identities.
3. Add staging/production web domains to Authorized Domains and restrict public API keys by app/domain where supported.
4. Configure password/OTP abuse controls, templates, quotas, and monitoring before release.

## Mobile

Set the `EXPO_PUBLIC_FIREBASE_*` values in ignored local files and EAS environment variables. Analytics remains disabled unless consent policy is approved and `EXPO_PUBLIC_FIREBASE_ANALYTICS_ENABLED=true` is explicitly configured.

## API

Choose exactly one server mode:

- Workload identity/application-default credentials: set `FIREBASE_PROJECT_ID` and `FIREBASE_USE_APPLICATION_DEFAULT=true`.
- Encrypted service-account values: set `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, and `FIREBASE_PRIVATE_KEY` in the deployment secret manager.
- Local emulator only: set `FIREBASE_PROJECT_ID` and `FIREBASE_AUTH_EMULATOR_HOST`. Emulator mode is rejected in production.

Never commit a service-account JSON file or private key. Restart the API after rotating credentials and verify login, token expiry/revocation, logout, and role synchronization.

At startup the API logs only the selected Firebase Admin mode. It never logs project credentials or key material. An unconfigured development API remains available for public routes, but protected routes return `AUTH_PROVIDER_NOT_CONFIGURED`; staging/production environment validation fails before listening.
