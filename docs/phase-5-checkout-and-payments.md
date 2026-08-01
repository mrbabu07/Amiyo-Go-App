# Phase 5: Checkout and Payments

## Delivered

- Authenticated cart APIs with authoritative catalog prices and inventory availability.
- Short-lived checkout quotes with integer minor-unit subtotal, delivery, tax, discount, and total values.
- Serializable checkout transaction that validates stock, locks inventory, reserves quantities, snapshots order data, and creates one vendor order per seller.
- Required UUID `Idempotency-Key` handling with replayed checkout responses and automatic serializable conflict retries.
- Durable payment attempts, invoices, order events, and outbox events created with the order.
- Signed payment webhook ingestion with provider event replay protection, amount reconciliation, and pending-order confirmation.
- Development-only payment capture sandbox at the returned `actionUrl`; production never exposes sandbox routes.
- Expo cart and checkout screens with address selection, payment method selection, quantity controls, and product add-to-cart.

## Configuration

- `CHECKOUT_DELIVERY_FEE_MINOR` is the per-vendor delivery charge and defaults to `6000` (BDT 60.00).
- `PAYMENT_WEBHOOK_SECRET` signs provider callbacks using HMAC SHA-256 in `x-payment-signature`.
- `API_PUBLIC_URL` must be reachable by the client for sandbox or provider action URLs.
- Checkout is authenticated-only until the guest-checkout product decision is approved.

## Validation

- Contract tests cover cart quantities, payment methods, and OpenAPI commerce routes.
- PostgreSQL tests cover checkout key uniqueness, atomic stock reservation, and payment event replay protection.
- Mobile source tests cover checkout radio semantics, headers, and quantity-control labels.
- Real bKash, Nagad, and SSLCommerz credentials and production callback URLs remain deployment inputs; adapters currently use the local sandbox contract.
