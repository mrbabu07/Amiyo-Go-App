# Reference layout alignment — 2026-10-07

## Scope

Follow the legacy Client layout, spacing, component grouping, navigation and responsive behavior while preserving Amiyo-App's current off-white, maroon, navy and olive light/dark palette. Do not copy the reference's orange/slate colors or modify Client/Server. Functionality and authorization must remain intact.

## Current pass: customer returns

Source reference: `Client/src/pages/Returns.jsx`. Rebuilt `ReturnsScreen` now has a back-to-orders header, request action, three summary cards, article-style return cards, product/reason column and status/refund column. Cards stack below 1024px; header/metrics stack on small screens. Children release row flex sizing when stacked. Buttons are independent of their card container and at least 44px high. All surfaces/text use existing theme tokens; palette definitions are unchanged.

No eligibility count is invented: the current API only returns a bounded return list, so the first metric is requests shown rather than the reference's eligible-order count. Start-return currently opens orders; the inline reference wizard, evidence previews and contextual support escalation are still gaps. Tracking opens the actual event-backed detail rather than inventing completed timeline steps on each list card.

## Remaining alignment scope

- Complete the returns wizard/evidence/contextual support and inline tracking interactions.
- Compare customer home, category/search, shop, product, cart, checkout, orders, profile/address and support layouts.
- Compare seller onboarding, products/forms, order fulfillment, invoices, returns, finance and university.
- Compare admin navigation, dashboard, catalog, orders/invoices, vendors, commission, payout and operational queues.
- Verify each group at narrow mobile and desktop widths, with loading/empty/error, keyboard and dark-theme states.

Tests prove code/contract behavior only, not pixel or visual equivalence. The browser connection succeeded on this pass; rendered acceptance will be recorded separately after the local app loads.

## Verification this pass

- Mobile TypeScript, all 73 mobile tests, two after-sales route/wiring tests, production web export, secret scan and whitespace checks passed. Palette file diff is empty.
- With user-approved local customer demo login, rendered `/returns` at a measured 1280px width showed the new header, three metrics, product/reason column and status/refund column with the retained maroon/olive palette. The existing return fixture loaded its real product image, variant and amount. No order/return mutation was submitted.
- Browser control intermittently reported detached controls and CDP timeouts; a login reload and screenshot-grounded interaction succeeded. The requested 360px viewport override did not take effect (measured width remained 1280px), so mobile rendered acceptance is not claimed. The override was reset.
- Reference comparison for this pass is source-guided, not a screenshot-to-screenshot approval. Inline wizard/tracking/evidence and the other page groups remain open.

## Customer orders follow-up

Compared `Client/src/pages/Orders.jsx` header and seven status groups with `CustomerOrdersScreen`. Replaced the unrelated dark promotional hero with the reference-style back/header, My Returns and Continue Shopping actions. Added pending, processing, shipped and return/refund tabs with counts and horizontal overflow rather than cramped wrapping on mobile. Grouping covers every supported parent status; after-sales/unknown states no longer default to a shipped progress indicator. Current theme tokens remain unchanged, and unavailable images use the existing local accessible fallback rather than a blue external placeholder.

Compact order cards stack their headings and explicitly release flex sizing for product copy. Detail/tracking/invoice links and account-scoped fetching are retained. Expanded item/payment summaries, inline review/cancel/return interactions and rendered mobile/desktop comparison are still open; this follow-up does not claim full Orders parity. Browser reconnection encountered stale tab ownership followed by browser-unavailable, so no new Orders screenshot is accepted as evidence.

Orders follow-up checks: mobile TypeScript, all 75 mobile tests, full suite including 91 repository checks, secret scan and whitespace check passed. Status classification tests cover all ten supported parent states and ensure return/refund states cannot be shown as shipped. Progress labels now say Processing rather than claiming the package is already packed.

## Inline order expansion

The order preview now acts as an accessible expand/collapse disclosure, matching the reference's in-list detail interaction. Independent full-detail, tracking and invoice links remain. Expanded content mounts on demand, so collapsed cards do not fetch full detail/tracking. Both queries use account-scoped keys and existing authenticated ownership-checked APIs.

The expanded area groups all purchased products by seller package and displays snapshot name/SKU/attributes, images, quantities, unit/line prices, discounts, package totals, delivery address, payment/refunded amount and order totals. Shipment events are matched by vendor-order ID and show actual timestamps. Missing events, payment/address data and fetch failures have explicit states; no completed delivery is fabricated. Existing theme tokens are used throughout, with stacked small-screen summaries.

Inline cancel/review/reorder/return workflows, rescheduling, return trackers and evidence remain to be aligned. This read-only expansion introduces no payment or order mutations. Tests for disclosure wiring and query scope are source-level, not mounted React/browser interaction acceptance.

Expansion checks: mobile TypeScript, all 77 mobile tests, full suite including 91 repository checks, secret scan and whitespace check passed. The navigation regression now asserts the disclosure alongside retained independent destination links. No browser visual acceptance is claimed for the expanded state yet.

## Wishlist layout and cart action

Compared `Client/src/pages/Wishlist.jsx`: the rebuilt page now has a back/header, saved-item count, cart destination, desktop saved-list/sharing sidebar and main product area. The workspace stacks below 1024px. Removed the unrelated dark hero, fixed minimum card width and hardcoded slate/green privacy colors; palette definitions remain unchanged. Product cards have independent open, Add to cart and remove controls with 44px targets and local missing-image fallback. Sharing failures are surfaced instead of becoming unhandled rejections.

Add to cart fetches current product details, rejects sold-out variants, routes multiple-choice products to their detail selector and updates only the initiating account's cart cache. Saved products are not silently removed after adding. Existing authenticated wishlist/share/remove APIs remain in use. Collections CRUD, per-product price/stock/flash-sale alerts and variant-aware bulk wishlist-to-cart remain reference gaps; no fake controls or alert promises are displayed.

Verification: mobile TypeScript, all 80 mobile tests, the full suite including 91 repository checks, secret scan and whitespace checks passed. New tests exercise variant policy and source-level account/layout wiring; they are not mounted component tests. Browser inspection of the existing demo session verified the empty/private wishlist at measured 360px and 1280px widths without horizontal document overflow. Dark mode inspection identified low-contrast secondary labels, which now use the existing text token. Original light mode and viewport were restored. No share, remove, cart, order or payment mutation was submitted. Populated cards, cart/share mutations and final dark-mode contrast acceptance still require interactive verification; this pass is not full reference parity.

## Wishlist collections follow-up

Added owner-scoped collection summaries, create, rename and delete APIs using the existing Wishlist tables (no schema migration). Names are trimmed and bounded to 80 characters; creation caps custom collections at 20 within a serializable transaction. Default-list creation also rechecks inside a serializable retry transaction. Default lists cannot be renamed/deleted through collection management. Deleting a custom list cascades its items/share record according to the existing Prisma relations, without deleting products or other lists.

Existing list/item/share APIs accept an optional validated collection ID and check ownership before reads or writes. Omitting it preserves default-list behavior for header hearts and existing consumers. OpenAPI documents the new endpoints and selector. The UI adds selectable collection counts, named-list creation, rename, explicit inline delete confirmation, per-collection sharing and product-to-collection copying. Product removal only affects the selected collection, matching the legacy behavior. In-flight list responses retain their original account/list cache key when selection changes.

Verification: project build, mobile type-check, 81 mobile tests and full suite including 91 repository checks passed. Seven focused collection service tests and 61 contract tests passed after adding ownership, limit, share-target, default protection and input coverage. Service tests use Prisma doubles, not a live database round-trip or cascade/concurrency integration test. Browser DOM confirmed the default collection count and disabled empty-name create control using the existing demo session. No collection/share/product mutation was submitted in that session. Collections still need populated create/rename/copy/delete browser acceptance; per-product alert parity and bulk cart remain open.

## Populated collection acceptance and corrections

With explicit user approval, browser testing created a temporary demo collection, renamed it, saved Travel Organizer Bundle from the catalog, copied it into the collection and deleted the custom collection through its confirmation UI. The product remained in the main wishlist after collection deletion. The catalog heart stayed on the listing rather than navigating to product detail. No cart, order, payment, public sharing or real-account action was submitted.

Populated rendering exposed a sparse-row layout defect: a single product stretched to 960px. Cards now grow/shrink within a 360px cap; the rendered card measured 360px on desktop and 344px at a 360px viewport, with no horizontal document overflow. The mobile screenshot shows independent Add to cart, remove and collection actions. Catalog and product-detail heart mutations now invalidate account-scoped collection counts instead of waiting for a later refetch.

The baseline migration already has a partial unique index for default wishlists. Default creation now also recovers a committed P2002 winner, without masking unrelated database failures. Nine focused service tests cover this and the collection rules. A new isolated PGlite test executes the actual baseline migration and verifies unique default/item constraints, collection rename/delete predicates, share/item cascade cleanup and preservation of the product and main list. This is database-constraint evidence, not multi-connection Prisma concurrency evidence.

An initial browser create request was interrupted by a development-server restart. A fresh read confirmed no collection was created before retrying. The stable subsequent browser lifecycle passed. Public sharing, populated cart mutations, multi-connection concurrency, alert parity and bulk cart remain outside this acceptance pass.

Final verification: mobile type-check, all 82 mobile tests and the full suite including 92 repository checks passed; secret scan and whitespace checks passed. The temporary collection was deleted. Its test product remains in the demo customer's default wishlist pending the separately requested cleanup confirmation. Browser viewport was restored.

## Alert account isolation

### Product alert email delivery

Product-alert matches now queue email independently of push when the customer has an email address and the account price-drop email preference is enabled. The notification worker handles only the two supported product-alert email types, rereads account status/deletion/email opt-out before sending, and preserves the in-app notification when external delivery is skipped or fails. Email uses plain text and a product link restricted to the configured app origin. Invalid app URLs or unsupported notification types fail closed.

The existing Resend adapter receives a stable delivery-specific idempotency key; provider/network or persistence failures remain retryable with that key. Completed deliveries are not resent by the processor. Product-alert email jobs older than 23 hours are rejected to avoid replay after the provider's 24-hour idempotency retention window ([Resend documentation](https://resend.com/changelog/idempotency-keys)). A changed recipient or configuration can cause a provider payload-conflict error on retry; the code does not evade it with a fresh key. Provider acceptance is recorded using the existing delivery status and provider reference; this does not prove inbox arrival, and bounce/webhook reconciliation remains open.

Worker operation needs `APP_PUBLIC_URL`, `EMAIL_PROVIDER_TOKEN`, `EMAIL_FROM`, the existing database/Redis and a running notification worker. No real email or remote customer mutation was used in development. Fake-provider tests cover preference changes, inactive/deleted recipients, missing email, expired jobs, safe links, stable retry payloads, recorded receipt, duplicate completed jobs and failures. Scheduler tests cover separate email/push choice. Independent per-collection stock/price/flash subscriptions and real provider acceptance remain unfinished.

Verification: full build/workspace suites and 92 repository checks passed. The final focused worker rerun passed all 23 tests, including pending-email routing through the actual notification processor. Secret scan and whitespace checks passed. This is fake-provider acceptance, not evidence of inbox delivery.

### Wishlist target-price controls

Wishlist cards now expose a separate expandable alert editor outside the product link. Customers can enter a BDT target, switch to availability alerts, see the saved condition or turn it off. The editor retains the current palette, labels its decimal input and uses 44px actions. It explicitly explains the current one-product/one-rule behavior across collections rather than pretending to offer legacy independent stock/price/flash switches.

English and Bangla digits convert to minor units using bigint; zero, negative, malformed, over-precision and PostgreSQL bigint-overflow targets are rejected. The API input contract now applies the same positive/bounded amount rule, and OpenAPI was regenerated. Account-scoped queries and post-mutation identity guards prevent cross-account cache updates; failed/ambiguous mutations revalidate alert state without automatic write retries.

Verification: mobile type-check, all 93 mobile tests, contract tests, full build/workspace suites and all 92 repository checks passed; secret scan and whitespace check passed. Browser inspection at 360px showed no horizontal overflow and 312-by-44px input/actions. The editor accepted a Bangla draft and rendered correctly; the draft was cleared and viewport restored. No alert mutation or provider send was performed. Independent multi-type/collection alert preferences, flash-sale controls, email delivery and end-to-end delivery acceptance remain open.

### Product alert processing

The worker now starts a product-alert scheduler. Each poll visits up to 250 active subscriptions using an advancing ID boundary, so an early unmatched subscription does not starve later records. It rechecks approved products, active shops, approved vendors, active/non-deleted customers, active BDT variants and unreserved inventory. A target price matches at or below the requested amount; available stock and price must belong to the same option. Money comparisons use bigint.

Claiming a subscription, creating its in-app notification and enqueueing optional push delivery run in one serializable transaction. A subscription becomes inactive only when the notification/outbox transaction commits. Repeated polls cannot claim it twice; an explicit re-subscription can notify again. Serialization/transient failures are reported and retried on a later scan. The push opt-out under account price-drop preferences is respected. Shutdown drains the current alert poll before disconnecting Prisma.

Operation requires the existing worker, database and Redis. In-app notifications do not depend on push tokens; actual push requires a valid registered Expo token and the existing provider. This pass does not implement email/SMS, collection-level preferences, flash-sale alerts or independent simultaneous stock and price subscriptions. It does not claim real-device delivery or multi-connection concurrency acceptance. Worker tests cover target/inventory matching, exact money, opt-out, duplicate polls, deliberate re-subscription, modeled rollback and bounded scan progression. No live customer notification job was run during development.

Verification: full build and workspace suites passed, including 15 worker tests and 90 mobile tests, followed by all 92 repository checks. Secret scan and whitespace checks passed. Production/provider and browser alert-delivery acceptance remain unverified.

Alert queries in product details and the alerts screen now include the Firebase account UID. The alerts screen subscribes to identity changes. Mutations capture their initiating account and cannot update the cache after switching accounts; a stale account cannot initiate an alert write. This fixes cross-account cached alert visibility, not alert delivery parity. Both source regression checks, all 90 mobile tests and mobile type-check passed. No additional browser or notification-delivery acceptance was performed in this pass. Price/stock delivery processing and legacy alert preference parity still require verification and implementation where absent.

## Wishlist to Cart action

Added the legacy selected-list bulk cart action while retaining the current palette. It copies one unit of each unique available single-option product using the existing authenticated cart API. Multi-option products are not guessed: their results link to the product selector. Sold-out/unavailable products have explicit outcomes. Saved items and collections are never removed by this action.

The operation checks account identity before reads and writes, serializes its writes, prevents overlapping bulk operations for the same account in the current runtime, and never automatically retries cart writes. An unconfirmed write stops later additions and prompts cart review because the last item may already have committed. Cart queries are invalidated for the initiating account so review does not rely on stale cached totals. Individual add/remove controls are disabled while the bulk action is running; result rows distinguish added, skipped and unattempted products.

This is not an atomic server batch or durable cross-restart idempotency guarantee. Review the cart after an interrupted run; browser reload does not reconstruct a partial run. Unit tests exercise mixed availability/options, duplicate products, read failures, partial write failure, identity changes and same-account overlap. The source wiring test covers the account-scoped cart cache and disabled replay button.

Checks passed: mobile type-check, 88 mobile tests, full suite including 92 repository checks, secret scan and whitespace check. Browser inspection verified the visible action and a 312px by 44px button at a measured 360px viewport without document overflow. No cart mutation was submitted in the browser during this pass. Viewport was reset. The earlier collection/card correction commit was successfully pushed; per-product alerts, durable bulk recovery and broader page parity remain open.
