# Legacy parity matrix

This matrix tracks the rebuild against the read-only legacy `Client` and `Server` projects. All implementation lives inside `Amiyo-App`.

## Customer experience

| Area | Status | Rebuild coverage |
| --- | --- | --- |
| Store discovery | Implemented | Home, categories, search, shops, campaigns, flash sales, product detail |
| Commerce | Implemented | Cart, checkout, orders, tracking, cancellation, returns and refunds |
| Account | Implemented | Firebase session, profile, delivery addresses and role-aware navigation |
| Engagement | Implemented | Wishlist sharing, alerts, loyalty, notifications, vendor messages, product Q&A and personal reviews |
| Support | Implemented | Ticket creation, threaded customer replies and status tracking |

## Vendor experience

| Area | Status | Rebuild coverage |
| --- | --- | --- |
| Dashboard | Implemented | Vendor overview and scoped navigation |
| Orders | Implemented | Vendor order queue, detail and fulfillment transitions |
| Finance | Implemented | Balance, ledger and payout requests |
| Catalog operations | API implemented | Product creation, updates and inventory adjustment; expanded mobile management UI remains iterative |

## Admin experience

| Area | Status | Rebuild coverage |
| --- | --- | --- |
| Operations | Implemented | Delivery retry, return/refund, payout, COD and audit-oriented queues |
| Promotions | Implemented | Promotion and campaign management |
| Support | Implemented | Cross-customer ticket queue and status workflow |
| Trust and safety | API foundation | Product moderation exists; richer KYC and user-management screens remain iterative |

The rebuild now covers the primary purchase and after-sales journey end to end. Remaining legacy parity work is concentrated in advanced vendor catalog tooling and deep admin trust-and-safety workflows.
