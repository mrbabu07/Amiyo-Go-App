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

- Server-side order/customer/phone/product search and status/store filters are implemented before pagination with vendor scoping. Queue counters now aggregate all seller packages independently of the current search, with unavailable states instead of misleading zeroes. Payment filtering still needs server-side integration.
- Inline order expansion lazily loads account-scoped package products, delivery, payment and recorded shipment events, with manage/print links. Wide screens now use an order/customer/product/payment/status/actions table sharing selection and expansion with mobile cards. Visual verification remains open.
- Inline order expansion now also loads package-scoped return cases through a seller-owned server filter and links pending cases directly to the existing evidence/response/receipt workspace.
- Separate Code 128 scanner barcode export is implemented on the package documents page, with the same server-side ownership checks as parcel documents. It identifies the parcel without replacing signed-QR verification. Physical scanner/print verification remains open.
- Transition replay now rechecks active management permission and current vendor ownership before exposing a saved response. Server rejection/cancellation requires a reason; sellers cannot impersonate courier movement. Cancellation inventory/refund effects and recovery/error-path audit, including reload during bulk work, remain open.
- Reference-matched browser review at desktop and 360px mobile widths, print preview and final full regression.

The earlier production-gap document's assertion that no code-only gaps remain does not establish seller reference parity; the open items here supersede that assertion for this scope.
