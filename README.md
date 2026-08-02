# Amiyo-Go App

Production rebuild workspace for the Amiyo-Go mobile platform.

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

1. Copy `.env.example` files and add real values locally only.
2. Run `npm install`.
3. Run `npm run prisma:generate`.
4. Start services with `docker compose up -d`.
5. Run `npm run dev:api`, `npm run dev:worker`, and `npm run dev:mobile`.

For the current identity setup and Firebase requirements, see `docs/phase-3-identity-and-authorization.md`.

For a populated local marketplace, start the Firebase Auth Emulator with `npm run dev:firebase`, configure the ignored `apps/api/.env`, then run `npm run demo:setup`. This seeds categories/products and creates Customer, Vendor, and Admin test accounts documented in `docs/runbooks/firebase-auth-setup.md`.

Catalog, search, shops, vendor inventory, and mobile discovery are documented in `docs/phase-4-catalog-search-and-discovery.md`.

Cart, transactional checkout, payment webhooks, and the local payment sandbox are documented in `docs/phase-5-checkout-and-payments.md`.

Vendor fulfillment, transactional delivery dispatch, Amiyo Delivery callbacks, and customer tracking are documented in `docs/phase-6-vendor-orders-and-delivery.md`.

Cancellation, returns/refunds, vendor ledger/payouts, COD reconciliation, and mobile operations queues are documented in `docs/phase-7-returns-finance-operations.md`.

Wishlists, alerts, reviews, Q&A, chat, notifications, loyalty, campaigns, flash sales, and promotion controls are documented in `docs/phase-8-engagement-and-growth.md`.

Deterministic migration tooling, synthetic dry runs, mapping coverage, and cutover/rollback requirements are documented in `docs/phase-9-data-migration.md` and `docs/migration/`.

Production hardening automation, release blockers, and operational runbooks are documented in `docs/phase-10-production-hardening.md` and `docs/runbooks/`.

The complete maintainer and operations handover index is available at `docs/handover.md`.

The web app runs at `http://localhost:8081` after `npm run dev`. Use `npm run dev:mobile -- --web` when only the Expo web client is needed.

Never commit real secrets. Rotate any database URL that has been pasted into chat.
