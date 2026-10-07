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
