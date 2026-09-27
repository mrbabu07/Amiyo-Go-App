# Payment Operations

## Webhook incident

1. Capture provider name, provider event ID, payment ID, order number, UTC timestamps, HTTP status, and correlation ID without recording secrets or full payloads.
2. Confirm HMAC verification is configured and inspect `payment_webhooks` for the provider/event unique key.
3. Compare payment amount/currency and provider transaction ID with the authoritative order snapshot.
4. Replaying the identical verified event is safe and must return a duplicate result without a second financial effect.
5. Do not mark a payment captured manually unless the approved finance workflow records immutable verification and audit evidence.
6. Reconcile payment, order status event, outbox event, refund history, and provider settlement before resolution.

Rotate a suspected webhook secret in the provider and encrypted environment manager, deploy/restart the API, and preserve evidence. Never store card data, PINs, OTPs, or unredacted provider credentials.

## SSLCommerz refund confirmation and recovery

- Initiation `success`/`processing` means the request was accepted, not that funds were refunded. Completion requires the separate status API to return `refunded` with the exact refund reference and the stored bank transaction ID. Both order and return refund completion enforce this before ledger writes. See the [official refund/status API](https://developer.sslcommerz.com/doc/v4/).
- Initiation reserves a durable `idempotency_records` entry under `sslcommerz-refund-initiation`, keyed by order ID/version. The provider transaction ID is deterministic for that reservation. Retrying the same payload reuses the saved provider reference; changing the payload is rejected.
- If the API returns `SSLCOMMERZ_REFUND_NOT_COMPLETED`, recheck the same refund reference. Do not submit a second refund to bypass the pending state. The customer refund, payment total and seller ledgers remain unchanged until verified completion.
- A timeout, process exit or database-save failure after dispatch can leave `INITIATING` without a reference. Automatic re-initiation is intentionally blocked, including under a new order version. Finance must obtain the existing reference/outcome from the merchant dashboard and reconcile it; do not delete the reservation to retry blindly.
- A completed local refund permits a later order-version refund. Reservations do not expire automatically. Access and repair of uncertain records require controlled operator review, provider evidence and an audit record; there is no automatic recovery UI or proof-free reset endpoint.
- A correct provider status does not itself prove the manually supplied amount. Finance must reconcile the requested amount with provider records, especially on manual-reference completion. Live concurrent requests, provider timeout and database-failure recovery still require staging evidence before release.
