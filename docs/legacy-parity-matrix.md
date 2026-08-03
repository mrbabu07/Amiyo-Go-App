# Legacy parity matrix

This matrix tracks the rebuild against the read-only legacy `Client` and `Server` projects. All implementation lives inside `Amiyo-App`.

## Customer experience

| Area | Status | Rebuild coverage |
| --- | --- | --- |
| Store discovery | Implemented | Home, categories, search, shops, campaigns, flash sales, product detail |
| Commerce | Implemented | Cart, checkout, orders, tracking, cancellation, returns and refunds |
| Account | Implemented | Firebase session, profile, delivery addresses, role-aware navigation and scheduled account deletion |
| Engagement | Implemented | Wishlist sharing, alerts, loyalty, notifications, vendor messages, product Q&A and personal reviews |
| Support | Implemented | Ticket creation, threaded customer replies and status tracking |

## Vendor experience

| Area | Status | Rebuild coverage |
| --- | --- | --- |
| Dashboard | Implemented | Vendor overview and scoped navigation |
| Orders | Implemented | Vendor order queue, detail and fulfillment transitions |
| Finance | Implemented | Balance, ledger and payout requests |
| Catalog operations | Implemented | Mobile product creation/submission, moderation status and concurrency-safe inventory adjustment |
| Vendor workspace | Implemented | Shop profile, KYC submission and encrypted masked payout account management |
| Customer engagement | Implemented | Seller review visibility and product-question response workflow |
| Vendor operations | Implemented | Derived sales reports, vendor-scoped returns, staff access controls and seller vouchers |

## Admin experience

| Area | Status | Rebuild coverage |
| --- | --- | --- |
| Operations | Implemented | Delivery retry, return/refund, payout, COD and audit-oriented queues |
| Promotions | Implemented | Promotion and campaign management |
| Support | Implemented | Cross-customer ticket queue and status workflow |
| Trust and safety | Implemented | Mobile user access, vendor approval, KYC review, product moderation and trust-case action queues |
| Content moderation | Implemented | Review and product-question visibility queues with audited actions |
| Platform operations | Implemented | Payment verification, category creation, marketing visibility and full audit activity |

The rebuild now covers the primary purchase and after-sales journey end to end. Remaining legacy parity work is concentrated in advanced vendor catalog tooling and deep admin trust-and-safety workflows.
