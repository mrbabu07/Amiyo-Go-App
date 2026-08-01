# Phase 6: Vendor Orders and Delivery

## Delivered

- Vendor-scoped order queue, order detail, optimistic transitions, idempotency keys, permission checks, and immutable audit records.
- Central parent-order derivation that waits for every active vendor before READY_TO_SHIP, SHIPPED, or DELIVERED.
- READY_TO_SHIP creates exactly one shipment, one delivery dispatch, and one transactional outbox event keyed `delivery-create:<vendorOrderId>`.
- Persistent outbox relay and BullMQ `delivery-dispatch` worker with stable job IDs, eight bounded retries, exponential backoff, retained failures, and durable attempt records.
- Signed Amiyo Delivery request compatible with the legacy timestamped HMAC contract and `/api/integrations/amiyo/orders` endpoint.
- Signed, timestamp-limited, API-key-protected callback ingestion with provider-event deduplication and stale event protection.
- Customer order list and per-seller tracking timelines, plus vendor fulfillment list/detail and READY_TO_SHIP actions in Expo.

## Configuration

- Worker: `AMIYO_DELIVERY_API_URL`, `AMIYO_DELIVERY_INTEGRATION_TOKEN`, optional `AMIYO_DELIVERY_WEBHOOK_SECRET`, and `AMIYO_DELIVERY_TIMEOUT_MS`.
- API callbacks: `AMIYO_DELIVERY_CALLBACK_API_SECRET`, `AMIYO_DELIVERY_CALLBACK_SECRET`, and `AMIYO_DELIVERY_CALLBACK_TOLERANCE_SECONDS`.
- Vendor pickup data is read from `vendor_shops.settings.pickupAddress`; production onboarding must require its final approved fields.

## Operations

- Failed jobs remain in BullMQ and every provider call creates a `delivery_attempts` row.
- A worker restart does not lose READY_TO_SHIP work because the PostgreSQL outbox is authoritative.
- Provider calls reuse the dispatch key as `Idempotency-Key`; database uniqueness remains the final duplicate-effect guard.
- Retry a failed dispatch by resetting its outbox event to `pending` only through a protected operations tool in a later phase.

## Remaining Deployment Inputs

- Real Amiyo Delivery staging URL, credentials, callback URL registration, and sandbox test identity.
- Approved vendor pickup-address requirements and rider contact exposure policy.
- Live Redis is required for the release gate; local tests verify durable database invariants without external credentials.
- `npm audit --audit-level=high` still reports the pre-existing Expo 51 transitive toolchain advisories; the available automatic fix upgrades to Expo 57 and must be handled as a tested hardening migration, not forced into this delivery phase.
