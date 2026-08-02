# Payment Operations

## Webhook incident

1. Capture provider name, provider event ID, payment ID, order number, UTC timestamps, HTTP status, and correlation ID without recording secrets or full payloads.
2. Confirm HMAC verification is configured and inspect `payment_webhooks` for the provider/event unique key.
3. Compare payment amount/currency and provider transaction ID with the authoritative order snapshot.
4. Replaying the identical verified event is safe and must return a duplicate result without a second financial effect.
5. Do not mark a payment captured manually unless the approved finance workflow records immutable verification and audit evidence.
6. Reconcile payment, order status event, outbox event, refund history, and provider settlement before resolution.

Rotate a suspected webhook secret in the provider and encrypted environment manager, deploy/restart the API, and preserve evidence. Never store card data, PINs, OTPs, or unredacted provider credentials.
