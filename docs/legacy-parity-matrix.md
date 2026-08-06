# Legacy parity matrix

This matrix tracks the rebuild against the read-only legacy `Client` and `Server` projects. All implementation lives inside `Amiyo-App`.

## Customer experience

| Area | Status | Rebuild coverage |
| --- | --- | --- |
| Store discovery | Implemented | Home, categories, search, shops, campaigns, flash sales, interactive product gallery, variant-aware product detail, delivery quotes and buyer protection |
| Commerce | Implemented | Inventory-bounded product quantity selection, cart, checkout, orders, invoices, tracking, cancellation, return detail tracking and refunds |
| Account | Implemented | Firebase session, profile, full delivery-address management, portable data export, role-aware navigation and scheduled account deletion |
| Engagement | Implemented | Wishlist sharing, product sharing and trust reports, alerts, loyalty, notifications, vendor messages, product Q&A and personal reviews |
| Support | Implemented | Ticket creation, dedicated conversation detail, threaded customer replies and status tracking |

## Vendor experience

| Area | Status | Rebuild coverage |
| --- | --- | --- |
| Dashboard | Implemented | Live shop status, sales/order/stock metrics, recent orders and dedicated seller-tool navigation |
| Orders | Implemented | Vendor order queue, detail, fulfillment transitions, printable packing slips and parcel labels |
| Finance | Implemented | Balance, ledger and payout requests |
| Catalog operations | Implemented | Searchable/filterable product workspace, dedicated Add/Edit/Detail flows, secure product media gallery, color/size variant matrix, per-variant pricing and stock, listing-quality checks, product submission, audited safe product removal, transactional CSV import/export, category-access requests and concurrency-safe inventory adjustment |
| Vendor workspace | Implemented | Dedicated Shop, KYC, Staff and Messages screens plus encrypted masked payout account management |
| Customer engagement | Implemented | Seller review visibility and product-question response workflow |
| Vendor operations | Implemented | Dedicated seller support and reports entry points, derived sales reports, return detail tracking, marketing, staff-permission and seller-voucher workspaces |

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
| Delivery configuration | Implemented | Audited delivery charges, free-delivery threshold, service-area hierarchy, zone pricing, customer availability checks and delivery estimates |

The rebuild covers the primary purchase, after-sales and model-backed marketplace operations end to end. Remaining production gates require approved external providers, credentials, business-policy decisions, real-device evidence and store submission access.
