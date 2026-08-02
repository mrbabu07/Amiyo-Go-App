# Phase 8: Engagement and Growth

## Acceptance gate

The notification matrix, deterministic promotion selection, and abuse/rate-limit tests must pass.

## Delivered

- Customer wishlists with expiring share links, stock/price alerts, verified-purchase reviews, product Q&A, notifications, secure participant-scoped chat, and a loyalty ledger.
- Active campaign and flash-sale feed with mobile deep-link destinations. The customer homepage now reads published campaign data instead of showing a hard-coded coupon.
- Vendor-authorized Q&A answers generate deduplicated in-app and pending push notifications.
- Admin promotion creation stores versioned conditions/effects. The pure promotion engine uses integer minor units and deterministic priority/ID tie-breaking.
- Engagement mutations use bounded request schemas and explicit review/Q&A/general and chat rate limits.
- Mobile wishlist, notifications, loyalty, messages, and admin promotion views.

## Safety boundaries

- Loyalty earning, expiry, redemption, and tier rules remain inactive until approved.
- Promotion stacking and coupon precedence remain inactive until approved. Created promotion rules are versioned but are not silently applied at checkout.
- In-app notification delivery works immediately. Push delivery rows remain pending until a provider and event-channel policy are approved and configured.

## Rollback

Deploy the previous API/mobile artifacts. Keep chat participants, notification idempotency keys, and loyalty ledger records. If a schema rollback is required, use a forward migration only after exporting those records; do not delete engagement history in place.
