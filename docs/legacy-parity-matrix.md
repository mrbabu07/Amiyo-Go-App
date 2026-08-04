# Legacy parity matrix

This matrix tracks the rebuild against the read-only legacy `Client` and `Server` projects. All implementation lives inside `Amiyo-App`.

## Customer experience

| Area | Status | Rebuild coverage |
| --- | --- | --- |
| Store discovery | Implemented | Home, categories, search, shops, campaigns, flash sales, product detail |
| Commerce | Implemented | Cart, checkout, orders, invoices, tracking, cancellation, returns and refunds |
| Account | Implemented | Firebase session, profile, full delivery-address management, portable data export, role-aware navigation and scheduled account deletion |
| Engagement | Implemented | Wishlist sharing, alerts, loyalty, notifications, vendor messages, product Q&A and personal reviews |
| Support | Implemented | Ticket creation, threaded customer replies and status tracking |

## Vendor experience

| Area | Status | Rebuild coverage |
| --- | --- | --- |
| Dashboard | Implemented | Vendor overview and scoped navigation |
| Orders | Implemented | Vendor order queue, detail, fulfillment transitions, printable packing slips and parcel labels |
| Finance | Implemented | Balance, ledger and payout requests |
| Catalog operations | Implemented | Mobile product creation/submission, transactional CSV import/export, audited category-access requests, moderation status and concurrency-safe inventory adjustment |
| Vendor workspace | Implemented | Shop profile, KYC submission and encrypted masked payout account management |
| Customer engagement | Implemented | Seller review visibility and product-question response workflow |
| Vendor operations | Implemented | Derived sales reports, vendor-scoped returns, staff access controls and seller vouchers |

## Admin experience

| Area | Status | Rebuild coverage |
| --- | --- | --- |
| Operations | Implemented | Delivery retry, return/refund, payout, COD and audit-oriented queues |
| Promotions | Implemented | Promotion and campaign management |
| Support | Implemented | Cross-customer ticket queue and status workflow |
| Trust and safety | Implemented | Mobile user access, protected platform staff role assignment, vendor approval, KYC review, product moderation and trust-case action queues |
| Content moderation | Implemented | Review and product-question visibility queues with audited actions |
| Platform operations | Implemented | Payment verification, category creation, dynamic category attributes, marketing visibility and full audit activity |
| Analytics and insights | Implemented | Period GMV, order and customer metrics, daily trends, purchasing segments, top products, top vendors and downloadable/shareable CSV reports |
| Newsletter communications | Implemented | Public subscription, reactivation, subscriber visibility and audited draft/scheduled broadcast management; external email delivery remains provider-gated |

The rebuild covers the primary purchase, after-sales and model-backed marketplace operations end to end. Remaining production gates require approved external providers, credentials, business-policy decisions, real-device evidence and store submission access.
