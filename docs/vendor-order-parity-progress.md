# Vendor order reference parity

Scope: compare `Client/src/pages/vendor/VendorOrders.jsx` and `VendorOrderDetail.jsx` with the Expo seller order workspace, preserving the current palette and operations-controlled logistics.

## Implemented in this iteration

- Seller queue shortcuts, all current lifecycle status filters, store/payment filters, select-visible packages and package print tools.
- Explicit status-change review and required rejection reason in the seller UI.
- Collection amount comes from the authoritative parcel-document service; errors never fall back to the package total. Amount formatting preserves integer minor units.
- Persistent per-account/package transition recovery retains the original version, reason and UUID after ambiguous responses, refuses a different pending action and expires before server receipts.
- Selected/visible CSV export escapes spreadsheet formula prefixes, quotes text, preserves Bengali and exact monetary strings. Web downloads CSV; native shares CSV text.
- Bulk accept, start packing and ready-for-pickup use explicit review, stage eligibility, current versions and per-package recovery. Uncertain writes stop the remaining batch. Courier transitions remain operations-owned.
- Existing PromoTiles union narrowing errors corrected.

## Evidence

Mobile strict type-check and all 484 mobile tests passed. Focused API collection-amount tests passed. These are automated checks, not browser or physical printer acceptance.

## Still open

- Server-side search/filter across all orders and authoritative queue counters.
- Reference desktop table and inline order expansion.
- Return evidence/actions embedded within the order workspace.
- Separate scanner barcode export.
- Complete cancellation/rejection server validation and recovery/error-path audit, including reload during bulk work.
- Reference-matched browser review at desktop and 360px mobile widths, print preview and final full regression.

The earlier production-gap document's assertion that no code-only gaps remain does not establish seller reference parity; the open items here supersede that assertion for this scope.
