# Amiyo-Go App

[![CI](https://github.com/mrbabu07/Amiyo-Go-App/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/mrbabu07/Amiyo-Go-App/actions/workflows/ci.yml)
[![CodeQL](https://github.com/mrbabu07/Amiyo-Go-App/actions/workflows/codeql.yml/badge.svg?branch=main)](https://github.com/mrbabu07/Amiyo-Go-App/actions/workflows/codeql.yml)

Mobile-first multi-vendor marketplace built with Expo React Native, Node.js, Express, Prisma, PostgreSQL, Redis, and BullMQ.

## Requirements

- Node.js 24 LTS
- npm 10
- PostgreSQL and Redis, locally or through configured managed services
- Firebase project credentials for non-emulator authentication

## Structure

- `apps/mobile` — Expo React Native TypeScript app.
- `apps/api` — Express TypeScript API.
- `apps/worker` — BullMQ worker and schedulers.
- `packages/contracts` — shared Zod DTOs and API contracts.
- `packages/domain` — pure business rules and state machines.
- `packages/config` — typed environment parsing.
- `packages/observability` — logging and correlation helpers.
- `prisma` — PostgreSQL schema and migrations.

## Local Setup

```powershell
npm ci --include=dev
npm run prisma:generate
docker compose up -d
npm run dev
```

The combined development command starts Firebase Auth Emulator support, API, worker, and Expo. Open `http://localhost:8081` for web. If port `8081` is occupied, stop the old Expo process first or run the mobile workspace with an explicit free port.

To start only the Expo web client:

```powershell
npm run web
```

Copy the relevant `.env.example` files to ignored local `.env` files before using non-demo services. Never commit deployed credentials.

For a populated local marketplace, start the Firebase Auth Emulator with `npm run dev:firebase`, configure the ignored `apps/api/.env`, then run `npm run demo:setup`. This seeds categories and products and creates the Customer, Vendor, and Admin test accounts documented in `docs/runbooks/firebase-auth-setup.md`.

## Verification

```powershell
npm run type-check
npm test
npm run audit:runtime
npm run secret:scan
npm run release:check
```

`release:check` is intentionally stricter than build/test success. It reports external device, provider, restore, staging, retention, dependency, and approval evidence still required before production promotion.

## Documentation

- Identity and Firebase: `docs/phase-3-identity-and-authorization.md`
- Catalog, search, shops, and inventory: `docs/phase-4-catalog-search-and-discovery.md`
- Cart, checkout, and payments: `docs/phase-5-checkout-and-payments.md`
- Vendor fulfillment and delivery: `docs/phase-6-vendor-orders-and-delivery.md`
- Returns, finance, payouts, and operations: `docs/phase-7-returns-finance-operations.md`
- Engagement, loyalty, campaigns, and notifications: `docs/phase-8-engagement-and-growth.md`
- Migration and cutover tooling: `docs/phase-9-data-migration.md`
- Production hardening and runbooks: `docs/phase-10-production-hardening.md`
- Maintainer and operations handover: `docs/handover.md`

Marketplace search includes microphone voice input on supported browsers and native builds. Because speech recognition uses a native Expo module, test it with an Expo development or production build rather than Expo Go; unsupported environments fall back safely to typed search.

Never commit real secrets. Rotate any credential that has been pasted into chat or another non-secret channel.
