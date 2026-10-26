# Production Gap and Marketplace Differentiator Map

Current gate snapshot (2026-10-26): `npm run release:check` reports one unresolved business decision (`Data retention`) and five propagated high package nodes from two Expo build-tool advisories. API and worker runtime audits are clean. Android, iOS, finance-provider, restore, staging-smoke and retention-approval evidence remain missing. npm's suggested Expo 54 downgrade is incompatible with the pinned Expo 58 application and is not an acceptable remediation. Older counts below are retained only as dated verification history.

Current automated evidence (2026-10-27): the complete workspace and repository regression rebuilt the TypeScript workspaces and passed 1,118 tests: API 311, mobile 470, worker 56, config 10, contracts 86, domain 28, migration 2, observability 2, and repository hardening/integration 153. The operational query-index migration was applied successfully to the configured PostgreSQL database. Admin business rules now control processing and delivery SLAs, seller shipment reminders, COD/address review windows, buyer velocity review, and high-value order review thresholds. This proves the automated scope only; it does not replace the external evidence listed above.

Production web build evidence (2026-10-26): `npm --workspace @amiyo/mobile run export:web` completed successfully and emitted the Expo web entry plus 184 route chunks. Expo Router reported a non-fatal upstream package-export fallback and Sentry correctly remained environment-configured; neither warning prevented the production bundle. This proves static bundling, not browser, device or staging acceptance.

Product deep-link follow-up (2026-10-26): browser smoke exposed a product-detail hard reload that could remain on its loader after an HTTP `304`, although in-app navigation worked from cached React Query data. Public catalog fetches now bypass the browser HTTP cache and rely on the bounded application cache instead. A hard reload of `/product/seasonal-fresh-fruit-box` rendered the product, variant, price, seller, purchase actions, reviews, questions and related-product section against the local API.

Mobile web layout evidence (2026-10-26): a live browser smoke at `360x800` rendered the customer home, the storefront-to-product journey and the signed-out admin access shell with `scrollWidth` equal to `clientWidth` on every measured screen. The product journey displayed its variant, stock, price, Buy Now, Add to Cart, seller and protection content without horizontal page overflow. This covers those measured routes only and does not replace Android/iOS device acceptance.

Protected workspace evidence (2026-10-26): local demo-role browser smoke at `360x800` rendered the vendor dashboard, products and orders plus the admin dashboard, orders and commission hierarchy with live local data and no measured horizontal page overflow. Account navigation and sign-out actions now expose explicit button semantics for keyboard and assistive-technology discovery. This validates only the measured local web routes; it does not replace real-device or staging acceptance.

Current delivery boundary (2026-10-26): growth expansion and live payment-provider activation are intentionally deferred. Local-area logistics remains admin-configured and manually operated through delivery zones, inspection promises, pickup points, assignments, attempts, tracking evidence, COD reconciliation and return handling; no third-party courier automation is claimed. Within that boundary, no additional known code-only marketplace feature blocker remains. The outstanding release blockers require external infrastructure, real-device/provider/drill evidence, named retention approval, or a compatible upstream Expo security release.

Village assisted-commerce follow-up (2026-10-25): authorized admins can search sellable in-stock variants from Customer 360 and prepare a customer's cart after a phone request. The customer still reviews address, delivery, discounts and payment, so the admin workflow never places an order or charges the customer. The operation is controlled by `villageOperations.assistedOrderingEnabled`, validates active customer and stock state, creates an in-app notification, and records the admin's reason in the audit trail.

Village low-bandwidth follow-up (2026-10-25): the admin-controlled data-saver default and customer override now use one persisted policy hook with a shared storage read. When enabled, reusable product grids across home, search/category, shop, related products, and the featured-shop rail issue no card or shop image requests while retaining names, prices, stock-facing actions and navigation. Product detail still loads its primary image after deliberate navigation so buyers can verify the item before purchase.

Village language follow-up (2026-10-25): the customer profile locale is now authoritative for signed-in shoppers, while the admin village default applies to guests. Home village controls, assisted-order calling, data-saver actions, product-card add-to-cart actions and the bottom customer navigation have verified English/Bangla labels. This establishes the customer-shell localization path without falsely claiming that every administrative or seller sentence has been translated.

Offline experience follow-up (2026-10-25): the global connectivity banner now uses the active marketplace locale and brand palette. Bangla shoppers receive a clear offline message while React Query remains paused until connectivity returns; cached screens remain readable without a legacy warning color.

Workspace theme follow-up (2026-10-25): admin and seller navigation now use semantic on-primary, shell-muted, olive-accent and shell-danger tokens across light and dark mode. Legacy blue active markers and slate/red literals were removed from the shared shell so maroon actions remain readable against the navy command surface.

Workspace palette follow-up (2026-10-26): the remaining hardcoded slate admin dark-mode surfaces, search placeholders, generic orange eyebrow and gray heading copy were replaced by the approved navy, maroon, olive and off-white semantic palettes. The shared customer, seller and admin shell now follows the selected theme without reverting to the earlier blue/slate visual system.

Customer surface palette follow-up (2026-10-26): prominent home promotion copy, product comparison prices, ratings, hero badges, footer links, wishlist bulk actions and address placeholders now use semantic brand tokens instead of legacy blue/slate or literal white values. These high-frequency shopping surfaces therefore remain readable in both configured themes without drifting from the approved palette.

Seller surface palette follow-up (2026-10-26): seller order actions, bulk catalog controls, shop location, decoration/media previews and settings controls now use semantic on-primary, shell-muted and olive-accent colors. Literal white and legacy pale-slate text no longer drive these high-frequency seller command surfaces, while actual sellable product color choices remain intentionally unchanged.

Admin command palette follow-up (2026-10-26): order operations, commission rules and payout settlement now use the approved semantic palette for command totals, status badges, destructive notices, active controls and primary actions. These finance and order workspaces retain their operational status meaning without reverting to fixed slate, green or orange surfaces that break dark mode.

Manual delivery-area follow-up (2026-10-25): admins can independently enable same-union, same-upazila, same-district and outside-district delivery while retaining a fee for each zone. Customer quotes refresh against the selected saved address; guest quotes debounce a complete unsaved village location so the visible summary uses the same zone rules before address creation. Disabled zones return no charge, remain editable in guest checkout, and checkout revalidates the zone inside the order transaction before inventory or payment writes. This supports local manual delivery operations without claiming third-party courier automation.

Delivery inspection follow-up (2026-10-25): admins can choose closed-box delivery or a bounded 1-30 minute open-box inspection window. Checkout snapshots the active promise onto each order so later setting changes cannot rewrite an existing customer's delivery terms. Seller order detail exposes the exact sealed/open-box instruction for manual handoff, and closed-box settings cannot retain a misleading inspection duration.

Village pickup-point follow-up (2026-10-25): operations admins can create, edit and deactivate local pickup counters with complete phone and Bangladesh area details, while platform admins can enable customer pickup only after at least one active counter exists. Checkout validates the active counter, removes delivery charges, and saves an immutable counter snapshot on the order. Customer, seller and admin order details display the saved handoff location even if the counter changes later. Counter staffing, physical identity verification and local custody remain manual operating procedures.

Shop follow follow-up (2026-10-26): signed-in customers can persistently follow or unfollow an active shop from its storefront without opening seller chat. Public storefronts expose the current follower count, follow state is account-scoped and idempotent, and signed-out customers are sent through authentication before any write.

Shop service-policy follow-up (2026-10-26): every storefront now explains that manual delivery coverage and fees are confirmed at checkout, that returns use the product category's configured eligibility and window, and shows an evidence-backed public product-Q&A answer rate with its sample size. New shops show an explicit no-questions state instead of an invented response score.

Multi-store cart follow-up (2026-10-26): cart responses include the owning shop identity for every line and the customer cart groups products into seller packages with direct shop navigation and clear package-level delivery language. Customers can select all products, one seller package, or individual lines. Quote, coupon, loyalty, delivery, stock locking and order creation use only the server-validated selection; after a partial checkout, unselected lines remain in the active cart.

Checkout package follow-up (2026-10-26): authenticated and guest checkout now preview the selected products grouped by seller, including product images, variants, quantities and clear separate-dispatch language before the customer places the order. The quote contract also returns an authoritative seller-package breakdown with proportionally allocated discount, per-package manual delivery fee and final package payable total, so the UI does not infer finance totals from display lines.

Cart save-for-later follow-up (2026-10-26): each cart line now has explicit Remove and Move to wishlist actions. Moving a line verifies active-cart ownership and approved-product state, upserts the default wishlist before deleting the cart line inside one serializable transaction, then refreshes the account-scoped cart and wishlist caches.

Category return-policy follow-up (2026-10-25): admins can now keep the global return policy or apply audited category-specific 7-day, 14-day, evidence-required, or non-returnable rules. Subcategories inherit the nearest valid parent rule while retaining their own override. Product details no longer make a hardcoded return promise, customer order items expose zero returnable quantity for excluded categories, and return creation revalidates every selected product on the server. Growth, live payment-provider work, and automated third-party logistics remain outside this change.

Seller performance follow-up (2026-10-25): seller reports and the dashboard now expose an evidence-backed marketplace scorecard derived from fulfilment, seller cancellation/rejection, returns, 48-hour dispatch SLA and published product ratings. Every metric carries its target, sample size and health state; new sellers are not assigned a numeric score before five orders. The seller receives actionable recommendations and CSV exports include the same figures. This is operational guidance, not an automated penalty, suspension or financial deduction.

Checkout policy follow-up (2026-10-02): guest/customer payment choices and submission now share admin-controlled payment, maintenance, COD confirmation and rural-address checks. Guest forms and checkout columns stack on small viewports. See `checkout-policy-verification.md`; visual/device and provider acceptance remain open.

Checkout follow-up (2026-10-02): customer/guest submit guards, account-scoped durable recovery records and an original-checkout retry screen are implemented. Persisted requests preserve the original key across reloads, reject changed inputs while uncertain, and stop retrying before server idempotency expiry. See `checkout-retry-verification.md` for evidence and remaining provider/device/multi-tab limitations. This does not certify full reference parity.

Document parity inventory: `reference-document-parity.md` records legacy paths and document behavior. Wallet statements, order-date assessments and posted commission invoice exports are implemented. See `marketplace-launch-checklist.md` for finance changes and launch gates. Statutory tax documents, legacy reconciliation and signed-in print/device acceptance remain separate requirements.

## Finance export follow-up

- SSLCommerz completion now requires a separate provider status check (`refunded`) bound to the stored bank transaction and supplied refund reference. Initiation success/processing no longer posts completed refund ledgers. Durable order/version reservations reuse the provider reference and block ambiguous duplicate initiation; see `runbooks/payment-operations.md` for operator recovery requirements.

- Vendor Finance now offers monthly commission assessment PDF export beside the wallet statement, on web and native.
- The server restricts reads to the signed-in vendor workspace with `finance:read`; Bangladesh month boundaries, repeatable-read snapshots, exact integer arithmetic, explicit 5000-order limits and mixed-currency rejection apply.
- Cancelled/rejected packages remain visible but are excluded from assessed commission totals. Other order statuses are assessments, not proof of earned or collected fees. Discounts are displayed without claiming seller funding.
- Refund deductions and payout movements remain in the separate wallet statement, not added to platform earnings. Shipping debits, commission reversals and VAT are not invented.
- Added an explicit finance-admin order-to-wallet credit path. In Admin Order Details, select a delivered package, choose the shipping recipient, enter the reconciled net BDT amount and an approval reason. The server requires full captured payment, exact reconciled COD collection, elapsed delivery hold and return window, matching package version/amount, and no refund or non-rejected return. A serializable transaction writes one package-keyed credit and audit record. This is not an automatic backfill or bank transfer.
- Refund follow-up: per-package allocation now reduces subsequent settlement and reverses already credited seller net/commission with cumulative rounding. No wallet debit occurs before settlement. Completed, fully allocated partial refunds can settle; pending disputes, missing allocations and legacy gross debits still block approval. Posted commission invoices include reversals by posting month.
- Remaining accounting acceptance: finance must approve proportional refund allocation, platform-funded discount attribution, legacy opening balances and provider pending/completed reconciliation. Statutory VAT invoicing is not implemented by relabeling an ordinary report. An empty wallet statement is not evidence that a seller earned nothing.

Latest verification: see `verification-2026-09-28.md`. Account-switch isolation fixes and repeatable read-only smoke checks are implemented. Nine live read-only checks passed after transient database connectivity recovered; authenticated journeys and production acceptance remain pending.

Authenticated API follow-up (2026-09-28): `npm run smoke:authenticated` now checks existing demo customer/vendor/admin logins, role boundaries, finance/order reads, tracking and vendor package documents against the local API. All 24 checks passed without skips; workspace suites and 91 repository tests also passed. See `authenticated-marketplace-verification.md`; this does not close checkout/provider/device E2E gates. `GET /api/v2/me` no longer repeats the session database lookup already performed by authentication. Observed API latency still needs profiling before launch.

Date: 2026-09-01
Status: major marketplace workflows are implemented, but complete reference parity and production readiness have not been verified. Source-presence tests are not evidence that an entire customer journey works.

## Verification Update — 2026-09-16

Order-document follow-up: COD collection is now payment-state aware, customer invoices include shipment references, and admin invoice issuance is permission-checked and audited. See `reference-verification-2026-09-16.md` for exact scope and test limits.

- Invoice authorization no longer displays as captured payment.
- Customer/admin native invoice export generates a PDF with seller line items and requires a rendered QR; device testing remains required.
- Seller orders now support batches of up to 20 parcel labels or packing slips, with ownership-checked fetches and no partial export on fetch failure. Native PDF/physical printing and authenticated web acceptance remain unverified.
- A document verification route supports native camera scanning and pasted QR payloads. Web uses paste input. It distinguishes signed documents from matching current records and does not claim payment collection.
- QR verification rejects expired codes at the exact expiry boundary, oversized input and duplicate fields.
- At the time of this 2026-09-16 snapshot, release readiness reported 27 unresolved decisions. The current count is recorded at the top of this document; neither count is a live service health check.

### Remaining Work and Acceptance Evidence

1. Run customer, vendor and admin journeys against staging: multi-store checkout, stock contention, cancellation, partial refund, return and payout. Keep actual request/results and screen evidence.
2. Test camera permission denial, scan/retry, native PDF sharing and printed QR readability on Android and iOS. A native rebuild is required for added Expo modules.
3. Reconcile admin invoice issuance, seller thermal label/PDF workflows and current payment/collection state with the reference; document any missing controls.
4. Resolve dependency findings with compatible upgrades and regression tests; do not call the release security-approved based only on a successful build.
5. Provision live providers, workers, monitoring and backups; execute restore, payment reconciliation and operational incident rehearsals.
6. Measure latency and capacity under realistic concurrent shopping and checkout traffic before setting scaling targets. Marketplace size cannot be inferred from feature count.

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
- Intelligent marketplace discovery: 250ms live suggestions, product/shop/category results, typo-tolerant matching, recent searches, and 14-day trending terms are available from the shared search header.
- Personalized ranking: anonymous discovery sessions feed product-view, wishlist, and add-to-cart signals into category affinity, marketplace engagement, review, freshness, and active-campaign ranking.
- Review media: processed customer photos are owner-validated, projected through configured HTTPS storage without private keys, and rendered in product and personal-review galleries with enlarged navigation, broken-image retry, and touch-safe thumbnails.

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
- Expo build-tool advisory disposition: upgrade to a compatible fixed release when available, or obtain named security acceptance; do not apply npm's incompatible Expo 44 downgrade merely to produce a green audit.
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
- Admin-controlled customer cancellation window is explicit in the order UI and enforced against the same server-provided deadline.
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
