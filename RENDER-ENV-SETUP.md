# Render staging environment import

The local `.env.render` file is an import template, not a working deployment configuration. It is ignored by Git. Replace every `REPLACE_WITH_` value before importing. Do not upload this file or Firebase service-account JSON to GitHub or share their contents in chat.

## Fill the template

- `API_PUBLIC_URL`: the actual HTTPS URL assigned to this Render web service, without a trailing slash. Do not guess the service hostname.
- `CORS_ORIGINS`: start with the same actual service URL. Add comma-separated trusted web frontend origins when available. Native Android requests do not require a browser origin. Never use a wildcard for authenticated web requests.
- `APP_PUBLIC_URL`: leave empty until a supported HTTPS frontend/callback destination is available. Payment browser-return flows require separate configuration and testing.
- `DATABASE_URL`: Neon pooled connection string for the intended staging database/branch. Rotate the previously disclosed password first.
- `DIRECT_URL`: non-pooled connection string for that same database, used by Prisma migrations. Do not reset or seed an existing database blindly.
- `REDIS_URL`: the Redis protocol connection URL supplied by your provider (`redis://` or `rediss://`), not a REST endpoint or localhost. The current API environment schema requires it; this does not deploy a worker.
- `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`: use `project_id`, `client_email`, and `private_key` from the Firebase Admin service-account JSON for the intended project. This is not the Firebase web API key. Keep the private key quoted with its complete BEGIN/END lines and escaped `\n` line breaks, as in the JSON string. After import, ensure Render has the key content without literal surrounding quote characters. The backend handles escaped newlines.
- `FIREBASE_STORAGE_BUCKET`: verify the bucket name in the same Firebase project. A bucket name alone does not activate storage, grant access, or guarantee a free storage allowance.
- `FIREBASE_AUTH_EMULATOR_HOST`: keep empty. Do not use the laptop's emulator for this deployment. Enable Email/Password in Firebase Authentication; emulator demo accounts do not automatically exist in real Firebase.

Generate two separate secrets locally from PowerShell, then paste each output into the indicated field. Do not send outputs in chat:

`PARCEL_QR_SIGNING_SECRET`:

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

`VENDOR_DATA_ENCRYPTION_KEY`:

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"
```

Keep these values stable and backed up securely. If the target database already contains encrypted vendor data or issued signed documents, preserve its existing corresponding keys; replacing them without a migration/rotation plan can invalidate existing data or documents.

SSLCommerz credentials are intentionally empty. Leave both empty for initial deployment; this does not enable online payments. Use only rotated sandbox credentials for later staging payment tests. This file must not be treated as production configuration.

## Import

Render service > Environment > Add from .env: select the file or paste its contents as offered by the dashboard. Review imported values and choose Save only until all placeholders are replaced. Do not add `PORT`; Render supplies it.

Reference: https://render.com/docs/configure-environment-variables

## Before accepting deployment

The existing build command generates Prisma Client but does not apply database migrations. Review migration status and back up the target database before running `npm run prisma:migrate:deploy` against it. Do not run demo seeding on a live database.

After deployment, check `/health`, then `/ready` for database connectivity, and test real Firebase authentication. These checks do not establish complete marketplace readiness. Background notifications and other worker-driven workflows need their own worker deployment. Configure the Android app separately with the HTTPS API URL and emulator disabled; never put server secrets in `EXPO_PUBLIC_*` variables.
