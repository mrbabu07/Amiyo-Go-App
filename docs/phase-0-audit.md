# Amiyo-Go Mobile Rebuild Phase 0 Audit

Prepared: 2026-07-26

## Scope

This audit covers the existing `Client/` React/Vite storefront/admin/vendor UI and `Server/` Node/Express/MongoDB API. It does not modify legacy runtime code. The target rebuild must use a modular monorepo with Expo React Native, TypeScript Express API, separate worker, shared contracts/domain packages, Prisma, PostgreSQL, Redis/BullMQ, and object storage.

## Legacy Technology Inventory

### Client

- React 19, Vite 7, React Router, Tailwind, i18next, Firebase client auth, Axios, React Hook Form, Chart.js/Recharts, Leaflet, Swiper, PWA/offline utilities, Jest.
- Role-aware route groups exist for customer, vendor, and admin, with guards in `Client/src/routes/guards.jsx`.
- UI is web-first and desktop-heavy in admin/vendor modules; mobile rebuild should not directly port dense tables.

### Server

- Node.js/Express 5, MongoDB/Mongoose, Firebase Admin, Redis/ioredis/BullMQ, node-cron, Winston, Helmet/CORS/rate limits, multer/sharp, web-push, nodemailer, payment provider adapters, courier/delivery integration services.
- API mounts many route modules from `Server/index.js`; controllers currently contain substantial business logic.
- Background work exists both in API startup and worker files, so rebuild must separate API, worker, and schedulers.

## Feature Matrix

| Domain | Legacy Evidence | Rebuild Modules |
|---|---|---|
| Identity/auth | Firebase auth contexts, `userRoutes`, `accountRoutes`, `User`, role guards | `packages/contracts`, `packages/domain/access`, `apps/api/modules/identity`, mobile auth/onboarding |
| Customer commerce | product/category/search/cart/wishlist/order/review/support routes and pages | catalog, discovery, cart, checkout, orders, returns, support modules |
| Vendor operations | vendor dashboard/products/orders/finance/shop/KYC/staff/marketing routes and pages | vendor onboarding, catalog, order ops, finance, KYC, shop, staff modules |
| Admin operations | user/vendor/product/order/finance/logistics/promotions/trust/audit routes and pages | mobile admin task queues, approvals, audit, ops dashboards |
| Promotions/growth | coupons, vouchers, campaigns, flash sales, loyalty, rewards, recommendations | deterministic promotion engine and engagement modules |
| Delivery/logistics | delivery settings, shipment, dispatch, Amiyo Delivery callback/worker services | outbox-driven delivery dispatch, callbacks, shipment state machine |
| Payments/finance | payment routes, gateway services, manual verification, COD, payouts | payment attempts, webhooks, refunds, COD, ledger, settlements |
| Engagement | notifications, push, newsletter, chat, Q&A, reviews | push/in-app notifications, chat/support, review and Q&A modules |
| Observability/ops | health routes, env validation, logging, audit middleware | structured logs, correlation IDs, metrics, Sentry, runbooks |

## Legacy Route Inventory

### Public/customer route groups

- Storefront/catalog: `/`, `/products`, `/product/:id`, `/categories`, `/category/:category`, `/search`, `/shops`, `/shop/:shopSlug`, `/campaigns/:slugOrId`, `/flash-sales`.
- Customer account: `/login`, `/register`, `/profile`, `/addresses`, `/notifications`, `/loyalty`, `/my-alerts`.
- Commerce: `/cart`, `/wishlist`, `/wishlist/shared/:shareId`, `/checkout`, `/checkout/guest`, `/orders`, `/orders/:orderId`, `/orders/:orderId/track`, `/returns`, `/support`, `/messages`, `/my-reviews`.

### Vendor route groups

- Dashboard and education: `/vendor/dashboard`, `/vendor/university`.
- Catalog: `/vendor/products`, `/vendor/products/add`, `/vendor/products/edit/:id`, `/vendor/products/bulk`, `/vendor/products/:id`, `/vendor/category-requests`.
- Operations: `/vendor/orders`, `/vendor/orders/:orderId`, `/vendor/returns`, `/vendor/returns/:returnId`, `/vendor/messages`, `/vendor/qa`, `/vendor/support-chat`.
- Business settings: `/vendor/finance/*`, `/vendor/settings/bank`, `/vendor/marketing/*`, `/vendor/reports/*`, `/vendor/shop/*`, `/vendor/kyc`, `/vendor/settings`.

### Admin route groups

- Platform: `/admin`, `/admin/operations`, `/admin/platform`, `/admin/settings`, `/admin/staff`, `/admin/audit`, `/admin/audit-logs`, `/admin/analytics`.
- Marketplace: `/admin/vendors`, `/admin/vendor-requests`, `/admin/vendor-kyc`, `/admin/vendor-activity`, `/admin/products`, `/admin/inventory`, `/admin/categories`, `/admin/category-requests`.
- Commerce ops: `/admin/orders`, `/admin/logistics`, `/admin/delivery-settings`, `/admin/cod-reconciliation`, `/admin/cod-delivery`, `/admin/payment-verification`, `/admin/payment-verifications`, `/admin/returns`, `/admin/payouts`, `/admin/payout-requests`.
- Growth/trust/support: `/admin/promotions`, `/admin/banners`, `/admin/vouchers`, `/admin/coupons`, `/admin/flash-sales`, `/admin/offers`, `/admin/customers`, `/admin/trust-safety`, `/admin/support`, `/admin/reviews`, `/admin/qa`, `/admin/newsletter`.

## Legacy API Surface

Mounted groups include products, search, categories, orders, cart, shipments, user/account, wishlist, reviews, coupons/vouchers, addresses, returns, payments, webhooks, offers, support, flash sales, recommendations, discovery, growth, trust safety, platform/settings, stock alerts, loyalty, notifications/push, questions, delivery settings, delivery callbacks, vendors, shops, banners, vendor products/orders/logistics/growth, admin users/products/vendors/KYC/payment/cod/reviews/orders/finance/payouts/search/dashboard/promotions/logistics/customers/trust/audit/analytics/dispatch, category requests/fields, chat, store locations, newsletter, rewards, uploads, dynamic categories/products, and campaigns.

## MongoDB Model Inventory

Models discovered in `Server/models/`:

`Address`, `AdminVendorChat`, `AnalyticsSummary`, `AuditLog`, `Banner`, `Campaign`, `CampaignAnalytics`, `CampaignAuditLog`, `CampaignNotification`, `CampaignOrder`, `CampaignProduct`, `CampaignView`, `Cart`, `Category`, `CategoryField`, `CategoryRequest`, `Coupon`, `CustomerInsight`, `DeliverySettings`, `DispatchAssignment`, `DynamicCategory`, `DynamicProduct`, `FlashSale`, `Listing`, `LiveChat`, `Loyalty`, `Notification`, `NotificationDeliveryLog`, `NotificationSubscription`, `Offer`, `Order`, `OrderEvent`, `Payment`, `PaymentVerification`, `Permission`, `PlatformSettings`, `Product`, `Promotion`, `PushSubscription`, `Question`, `Recommendation`, `Return`, `Review`, `SellerProfile`, `Shipment`, `StockAlert`, `StoreLocation`, `SupportTicket`, `TrustSafety`, `User`, `Vendor`, `VendorChat`, `VendorOrder`, `VendorPayout`, `VendorShop`, `VendorStaff`, `Wishlist`.

## PostgreSQL Mapping Draft

| Legacy Models | Proposed PostgreSQL Tables | Notes |
|---|---|---|
| `User`, `Permission`, `Address`, `PushSubscription`, `NotificationSubscription` | `users`, `user_profiles`, `addresses`, `roles`, `permissions`, `user_roles`, `refresh_sessions`, `devices`, `push_tokens` | Normalize email/phone, provider subject, roles, sessions, devices. |
| `Vendor`, `VendorShop`, `VendorStaff`, `SellerProfile`, `VendorPayout` | `vendors`, `vendor_members`, `vendor_staff_permissions`, `vendor_shops`, `vendor_kyc_submissions`, `vendor_kyc_documents`, `vendor_bank_accounts`, `vendor_wallets`, `vendor_ledger_entries`, `vendor_payout_requests`, `vendor_payouts` | Ledger must be append-only; KYC docs private storage. |
| `Category`, `CategoryField`, `DynamicCategory`, `Product`, `DynamicProduct`, `Listing`, `StockAlert` | `categories`, `category_attributes`, `category_attribute_options`, `products`, `product_variants`, `product_media`, `inventory_items`, `inventory_movements`, `inventory_reservations`, `product_moderation_events`, `stock_alerts` | Dynamic fields move to normalized attributes plus bounded JSONB snapshots. |
| `Cart`, `Wishlist` | `carts`, `cart_items`, `wishlists`, `wishlist_items`, `shared_wishlists` | Cart prices remain display snapshots; checkout reprices. |
| `Order`, `VendorOrder`, `OrderEvent`, `Shipment`, `DispatchAssignment` | `orders`, `vendor_orders`, `order_items`, `order_addresses`, `order_adjustments`, `order_status_events`, `shipments`, `shipment_events`, `delivery_dispatches`, `delivery_callbacks`, `delivery_attempts`, `invoices`, `idempotency_records`, `outbox_events` | Parent order status must derive from vendor/payment state. |
| `Payment`, `PaymentVerification`, `VendorPayout` | `payments`, `payment_attempts`, `payment_webhooks`, `payment_verifications`, `refunds`, `cod_collections`, `cod_reconciliations`, `commission_rules`, `commission_entries`, `financial_ledger_entries`, `settlements` | Store money as integer minor units, not floats. |
| `Coupon`, `Promotion`, `Offer`, `Campaign*`, `FlashSale`, `Recommendation` | `coupons`, `coupon_redemptions`, `vouchers`, `promotions`, `promotion_rules`, `campaigns`, `campaign_products`, `campaign_events`, `flash_sales`, `banners`, `recommendation_events` | Promotion decisions must be versioned and reproducible. |
| `Review`, `Question`, `Return`, `SupportTicket`, `LiveChat`, `VendorChat`, `AdminVendorChat`, `TrustSafety`, `AuditLog`, `Notification`, `NotificationDeliveryLog` | `reviews`, `review_media`, `questions`, `answers`, `returns`, `return_items`, `return_events`, `support_tickets`, `support_messages`, `chat_threads`, `chat_messages`, `trust_cases`, `trust_actions`, `audit_logs`, `notifications`, `notification_deliveries` | Strong ownership and audit constraints required. |

## Critical Flow Findings

### Checkout and order split

- Existing order creation is API/controller-centered and still uses MongoDB collections.
- Guest checkout exists and must be re-approved in the decision sheet.
- Rebuild must implement checkout as a transaction: reprice, reserve inventory, create parent order/vendor orders/items, create payment attempt if needed, write status events, write outbox events.

### Payment and webhooks

- Legacy code supports Stripe, bKash, Nagad, SSLCommerz/manual flows and webhook routes.
- Rebuild must verify raw webhook signatures before parsing when provider requires raw body.
- Replay/out-of-order webhook handling must use unique provider event keys and idempotency records.

### READY_TO_SHIP and delivery dispatch

- Legacy code has multiple READY_TO_SHIP/pickup-ready paths across vendor dashboard/order/logistics/delivery queue modules.
- Rebuild must centralize the transition in `packages/domain` and emit exactly one transactional outbox event with idempotency key `delivery-create:<orderId>`.
- Delivery must not be created at checkout/payment.

### Returns, refunds, commission, payouts

- Legacy supports returns/refunds/admin force actions/COD confirmation/vendor finance/payouts.
- Rebuild needs ledger invariants: every balance-affecting mutation writes immutable ledger entries inside the same transaction.

## Role-Permission Draft

| Role | Primary Capabilities |
|---|---|
| `CUSTOMER` | Browse, cart, checkout, orders, returns, reviews, Q&A, support, notifications, profile deletion/export. |
| `VENDOR_OWNER` | Full vendor shop/catalog/order/finance/KYC/staff/marketing access scoped to owned vendors. |
| `VENDOR_MANAGER` | Vendor operations minus high-risk payout/bank/staff ownership actions unless granted. |
| `VENDOR_STAFF` | Granular permissions such as `orders:view`, `orders:manage`, `products:view`, `products:manage`, `support:view`. |
| `SUPPORT_AGENT` | Tickets, customer/vendor communication, limited order visibility, no financial approvals. |
| `FINANCE_ADMIN` | COD, payment verification, refunds, commission, ledger, payout approval. |
| `OPERATIONS_ADMIN` | Logistics, shipment exceptions, order operations, product/category moderation. |
| `SUPER_ADMIN` | Platform settings, staff/roles, all approvals, audit/ops access. |

## Secret Scan Summary

Potential secret-bearing file types were detected only as paths/types, not values:

- `.env.example` and `Server/.env.example`: placeholder database URLs and secret variable names.
- `Server/__tests__/`: test fixture secrets and local-only test keys.
- `Server/scripts/`: local Mongo defaults and test seed credentials.
- `Server/services/`, `Server/config/`, `Server/middleware/`: reads secret values from environment variables.
- `Client/src/firebase/firebase.config.js`: reads public Firebase config from Vite environment variables.

Important: a real Neon PostgreSQL URL was provided in chat. Rotate that credential before production use and keep the new value only in local ignored env files or encrypted deployment settings.

## Findings Ordered By Severity

1. Real database credential was shared in chat; rotate it before any push/deploy.
2. Existing repository has unrelated uncommitted modifications/deletions; commits must stage only Phase 0 files.
3. READY_TO_SHIP/delivery side effects appear spread across controllers/services and need one outbox trigger.
4. Business rules required by the production spec are still undecided.
5. Existing API is Mongo/Mongoose and controller-heavy; migration needs staged contracts/domain extraction.
6. Admin/vendor web UI is dense and should be redesigned for mobile task queues.
7. Background jobs are mixed into API runtime; production rebuild needs independently deployable worker.

## Phase 0 Gate Status

Blocked pending owner approval of decisions, ADRs, migration approach, and Phase 1 foundation scope.
