# Legacy MongoDB to PostgreSQL Mapping

## Automated foundation

| Legacy collection | PostgreSQL targets | Transformation |
|---|---|---|
| `users` | `users`, `user_profiles`, `user_roles` | Firebase subject, normalized contact fields, profile split, status normalization, and legacy role binding to seeded roles. |
| `categories` | `categories` | Deterministic parent UUID, slug/status normalization, percentage to basis points. |
| `vendors` | `vendors`, `vendor_members`, `vendor_shops` | Owner membership and shop are split from the legacy vendor document. |
| `products` | `products`, `product_variants`, `inventory_items` | Default variant/inventory rows are created; decimal prices become integer minor units. |
| `orders` | `orders`, `vendor_orders`, `order_items` | Embedded products are split by vendor with immutable item snapshots. |
| `payments` | `payments` | Provider/method/status normalization and exact decimal-to-minor-unit conversion. |

Every target ID is a deterministic UUID derived from `collection + legacy _id + row suffix`. Re-running the same export produces the same IDs and digest. Invalid money, missing IDs/references, empty orders, invalid quantities, and missing required names are rejected rather than coerced.

## Production export still required

The following legacy groups require representative sanitized exports before mapper implementation can be approved: addresses, vendor staff/KYC/bank data, category fields, product variants/media, inventory history, carts/wishlists, shipments/delivery callbacks, returns/refunds, COD, commission/payout history, coupons/vouchers/promotions/campaigns/flash sales, reviews/Q&A, support/chat/trust, notifications, loyalty, and audit history.

Those collections are not silently copied as JSON. Their embedded/polymorphic fields must be mapped and reconciled after samples establish the real production shapes.
