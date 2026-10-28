# Vendor order reference parity

Scope: compare `Client/src/pages/vendor/VendorOrders.jsx` and `VendorOrderDetail.jsx` with the Expo seller order workspace, preserving the current palette and operations-controlled logistics.

## Implemented in this iteration

- Seller queue shortcuts, all current lifecycle status filters, store/payment filters, select-visible packages and package print tools.
- Explicit status-change review and required rejection reason in the seller UI.
- Collection amount comes from the authoritative parcel-document service; errors never fall back to the package total. Amount formatting preserves integer minor units.
- Persistent per-account/package transition recovery retains the original version, reason and UUID after ambiguous responses, refuses a different pending action and expires before server receipts.
- Selected/visible CSV export escapes spreadsheet formula prefixes, quotes text, preserves Bengali and exact monetary strings. Web downloads CSV; native shares CSV text.
- Bulk accept, start packing and ready-for-pickup use explicit review, stage eligibility, current versions and per-package recovery. Uncertain writes stop the remaining batch. Courier transitions remain operations-owned.
- Prepaid package cancellation reserves one exact proportional payment share per seller package and exposes it in the finance refund queue. Completion is idempotent and records provider evidence, settlement reversal, customer ledger evidence and loyalty reversal.
- Existing PromoTiles union narrowing errors corrected.

## Evidence

The complete 2026-10-28 regression rebuilt every TypeScript workspace and passed 1,169 tests, including 334 API and 495 mobile tests. These are automated checks, not browser, native-device or physical-printer acceptance.

## Still open

- Bulk seller actions persist the account-scoped selected plan and completed package IDs for 23 hours, restore them after page/app reload, and safely reconcile a package already confirmed at the target status before continuing.
- Reference-matched authenticated browser review of the latest seller order changes at desktop and 360px widths remains open.
- Native PDF sharing plus physical label, barcode-scanner and signed-QR print acceptance remain external evidence requirements.

The remaining items require authenticated visual or physical-device evidence; no known seller-order code-only parity gap remains in this tracker.
