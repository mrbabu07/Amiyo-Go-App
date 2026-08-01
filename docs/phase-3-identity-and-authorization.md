# Phase 3: Identity and Authorization

## Delivered

- Firebase Admin ID-token verification on every protected identity request, including expiry and revocation checks.
- PostgreSQL-backed user synchronization with a default customer role, profile, role permissions, active vendor memberships, and vendor staff permission scopes.
- Trusted `POST /api/v2/auth/session`, `GET/PATCH /api/v2/me`, address CRUD, and device registration/revocation APIs.
- Immutable audit records for user creation and profile, address, and device mutations.
- RFC 7807 validation, authentication, account-status, conflict, and rate-limit responses.
- Strict local CORS allowlisting and an authentication-specific request limit.
- Expo email/password registration and login, Firebase session restoration, native persistence, SecureStore session metadata, logout cleanup, profile editing, and delivery-address management.
- Shared Zod contracts and OpenAPI 3.1 definitions for identity resources.
- Role, account status, ownership, vendor membership, and staff-permission matrix tests.

## Firebase Setup

Create `apps/mobile/.env` from `apps/mobile/.env.example` and register the Expo web, Android, and iOS applications in the same non-production Firebase project. Enable Email/Password authentication. Add `localhost` to authorized domains for web development.

Create `apps/api/.env` from `apps/api/.env.example`. Set `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, and `FIREBASE_PRIVATE_KEY` from a non-production service account. Keep the private key quoted with escaped newlines. Application Default Credentials can be used instead of the email/private-key pair in managed environments.

The API database must contain the Phase 2 migration and seed data before the first login because identity synchronization requires the seeded `CUSTOMER` role.

## Local Run

```text
npm install
npm run prisma:generate
npm run prisma:migrate:deploy
npm run prisma:seed
npm run dev
```

Open `http://localhost:8081`. Use the account icon or Account bottom tab to register and sign in. The API runs at `http://localhost:4000`.

## Security Model

Firebase proves the external identity only. The API never accepts roles or permissions from the mobile client or token claims. PostgreSQL is authoritative for account status, platform roles, vendor membership, and staff grants. Resource services must call the central authorization policy with ownership and vendor scope before sensitive access.

Firebase owns refresh-token rotation and revocation. Native Firebase persistence uses AsyncStorage as its supported persistence adapter; a non-token session marker is kept in SecureStore and removed during logout. Tokens, OTPs, phone numbers, addresses, and private keys are not logged.

## Gate Status

Build, strict type-check, OpenAPI generation, role matrix tests, bearer-token parsing tests, PostgreSQL migration tests, and Expo web export pass locally. Live Firebase login/logout/session-expiry E2E requires the team's non-production Firebase project and test identities; it must run before Phase 3 is promoted to staging.

`npm audit --omit=dev` still reports advisories in the Expo SDK 51 toolchain, including its archive tooling. npm's supported remediation is a breaking Expo SDK upgrade. Do not publish a production mobile binary until the planned Expo SDK upgrade is completed and the audit is rerun; forcing incompatible transitive versions was intentionally avoided.
