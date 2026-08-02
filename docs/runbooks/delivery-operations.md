# Delivery Operations

## Dispatch failure

1. Find the vendor order, `delivery_dispatch`, retained BullMQ job, delivery attempts, shipment, and outbox event.
2. Confirm the vendor order is `READY_TO_SHIP` and no successful external order ID already exists.
3. Fix provider/network/configuration issues, then retry through the approved operations mechanism using the existing dispatch and idempotency key.
4. Verify exactly one external delivery, one shipment, and a successful attempt. Never create delivery directly from checkout or payment.

## Callback failure

1. Confirm callback API key, timestamp tolerance, and HMAC signature validation without logging secret values.
2. Use provider event ID to distinguish replay from a new event.
3. Reject stale or invalid signatures. Valid duplicate events must not add a second status effect.
4. Reconcile callback, shipment timeline, vendor order status, parent order derivation, outbox event, and audit log.

Provider-specific retry/cancellation policy and rider-contact disclosure remain blocked decisions.
