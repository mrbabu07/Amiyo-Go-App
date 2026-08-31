# Production Gap and Marketplace Differentiator Map

Date: 2026-09-01
Status: reference-parity business-rule code is implemented; production launch remains blocked only by external configuration, rehearsal evidence, and named approvals.

## What Is Now Implemented

- Provider-specific refund guardrails: SSLCommerz, bKash, Nagad, and unknown providers require refund evidence before completion.
- Internal refund path: COD/manual/wallet refunds stay ledger-reconciled without a gateway reference.
- Promotion stacking: checkout can combine one customer coupon with one deterministic automatic order promotion.
- Discount safety: stacked discount is capped at 35% of subtotal.
- Payout settlement: verified bank/MFS, BDT 500 minimum, approved/processing state, provider, and transaction reference are required.
- Audit/ledger basis: seller wallet debits, finance ledger entries, payout reserves/releases, and admin audit records remain evidence-backed.
- Loyalty lifecycle: delayed earning after the fraud hold, bounded redemption, expiry, partial/full refund reversal, and redemption restoration are ledger-backed and idempotent.
- Promotion precedence: flash-sale price is applied first, then one coupon or voucher, then the best automatic promotion, then loyalty credit under the configured global cap.
- Admin business rules: loyalty, promotion stacking, partial-refund policy, provider evidence, payout minimum, hold, cadence, and automatic proposal controls are versioned platform settings.
- Settlement proposals: eligible approved payouts can be grouped into an auditable finance proposal; payment still requires explicit finance completion and provider evidence.
- SSLCommerz refunds: the API can initiate a sandbox/live refund through the official transaction-validation endpoint and persist the returned provider reference before ledger reconciliation.
- Referral program: each customer receives a shareable code; a valid first referral awards both accounts through an idempotent loyalty ledger entry.
- Customer operations: admin customer 360 includes referral history, loyalty balance, recent ledger entries, and audited manual award/deduct controls.
- Cart recovery: the worker creates deduplicated in-app/push reminders for signed-in customers whose active carts remain untouched for one hour.

## Production Work Still Pending

### External Configuration

- Production API/worker hosting, domain, SSL, CDN/storage public base URL.
- Production PostgreSQL/Redis deployment, managed backups, and restore drill evidence.
- Firebase Admin service account, native Android/iOS app registrations, authorized domains, Analytics consent.
- SSLCommerz live credentials and refund flow verification.
- Final bKash/Nagad/live card scope decision or explicit disablement.
- Sentry/OTel project keys, alert dashboards, and escalation channels.

### Mobile Release

- EAS Android/iOS projects, signing keys, package/bundle IDs, store accounts.
- App Store/Play Store metadata, privacy labels, screenshots, final logo/icon/splash.
- Real Android/iOS device E2E, accessibility, offline, push, login, checkout, refund, and payout verification.

### Finance and Operations

- Finance owner sign-off on the configured refund reversal, payout schedule, payout hold/dispute rules, settlement cadence, loyalty rates, and promotion cap.
- COD settlement operating model: one parent payment collection vs per-vendor shipment collection.
- Migration rehearsal, reconciliation approval, and production cutover plan.

### Security and Compliance

- Production secrets rotation, especially any database/payment/Firebase values shared outside secret storage.
- Data retention table/file/log policy and account-deletion legal retention sign-off.
- Load/security test report and dependency audit acceptance.
- Backup restore evidence and incident-response drill.

## Daraz / Cartup Public Baseline

- Daraz publicly documents return requests for damaged/defective/incorrect/incomplete products within 14 days for many categories and category-specific return limits.
- Daraz refund timing depends on payment method; examples include card reversals, mobile wallet reversals, COD bank deposits, and refund vouchers.
- Daraz seller marketplace terms publicly describe seller center, seller performance, cancellation, returns, refunds, and logistics responsibilities.
- Cartup publicly documents open-box/closed-box delivery rules, 7-day return windows for eligible closed-box issues, evidence requirements, refund timelines, and non-returnable categories.
- Cartup seller pages publicly promote seller onboarding, seller center, campaigns, seller app, easy fulfillment, and a 7-day payout cycle.

Sources:

- Daraz return policy: https://www.daraz.com.bd/return-policy
- Daraz refund policy: https://www.daraz.com.bd/refunds-policy/
- Daraz marketplace agreement: https://pages.daraz.com.bd/wow/i/bd/help-pages/marketplace-agreement?hybrid=1
- Cartup returns and refunds: https://cartup.com/content/returns-and-refunds
- Cartup seller platform: https://partner.cartup.com/

## Amiyo-Go Differentiators To Make It Best

### Seller Acquisition Advantage

- Product-wise and shop-wise commission overrides let Amiyo offer low introductory rates for new sellers without changing global rates.
- Seller payout reserve/release ledger makes payout status more transparent than a simple “paid/pending” flow.
- Dynamic category-specific product fields help sellers create richer listings without one generic form for every category.

### Customer Trust Advantage

- Store-wise invoice and order package breakdown gives customers transparency when one order contains multiple sellers.
- 30-minute customer cancellation window is explicit and enforceable.
- Evidence-backed returns, product images in order details, tracking timeline, invoice, support, and seller contact live in one account flow.
- Wishlist is first-class in navigation, not buried inside account.
- Referral rewards and a transparent points ledger give customers a visible reason to invite and return.

### Admin Control Advantage

- Admin has a finance-grade command center: refunds, payout review, provider references, seller payable, commission, invoice, audit, COD reconciliation, and logistics views.
- Promotion stacking is deterministic and capped, reducing margin surprises.
- Provider refund references are mandatory for gateway refunds, reducing manual finance mismatch.
- Payout completion requires verified bank/MFS and transaction evidence.
- Customer loyalty corrections require an admin permission, a positive amount, and a mandatory audit reason.

### Marketplace Experience Advantage

- Voice search, main/subcategory navigation, dynamic product attributes, modern seller registration, multi-store checkout, coupons, flash campaigns, and personalized account features can make the app feel more complete for local buyers.
- Automated abandoned-cart recovery and referral rewards add lifecycle growth loops without relying on manual campaign work.
- The brand can position itself as a “transparent seller-first marketplace”: lower starting commission, evidence-backed finance, faster seller onboarding, and clearer order/invoice tracking.

## Remaining Launch Priority

1. Rotate shared secrets and configure production secret storage.
2. Provision production hosting, PostgreSQL, Redis, storage/CDN, monitoring, and backups.
3. Configure Firebase Admin, native app registrations, EAS signing, and store accounts.
4. Run SSLCommerz live refund evidence and finance settlement rehearsal.
5. Run staging real-device E2E for checkout, refund, return, payout, and seller product flows.
6. Obtain finance, privacy, retention, migration, and release-owner sign-off.
