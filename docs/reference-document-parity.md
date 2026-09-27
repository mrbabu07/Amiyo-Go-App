# Reference document parity

## Scope and evidence

This inventory compares code paths, not every marketplace feature. Implementation and runtime acceptance are separate statuses.

| Reference behavior | Reference code | Amiyo-App state | Acceptance still needed |
| --- | --- | --- | --- |
| Packing slip export | `Server/controllers/vendor/vendorOrderManagementController.js`, `Client/src/pages/vendor/VendorOrderDetail.jsx` | Single-package web and native packing slips use the same A4 HTML template, seller-only items, totals and QR. | Signed-in web print preview and native sharing. |
| Parcel label | `Client/src/utils/__tests__/vendorParcelLabel.blackbox.test.js` | 100 x 150 mm template; package collection amount, not parent total. | Physical printer dimensions, long addresses, QR scan. |
| Batch labels/slips | `Client/src/pages/vendor/VendorOrders.jsx` | Up to 20 packages; one document per page; failed requests prevent partial export. | Signed-in multi-package print run. |
| Current invoice values | `Server/controllers/orderController.js:1461` | `OrderService.invoice` reads current authorized order data, retains invoice identity and signs a fresh QR. | Address/payment-edit-to-export journey. |
| Admin invoice regeneration | `Server/controllers/orderController.js:2151` | Admin can issue an invoice with permission and audit checks; exports render current data rather than replacing a stored PDF. | Confirm whether persistent PDF version history is required. |
| Monthly seller statement/tax invoice | `Server/controllers/vendor/vendorFinanceController.js:479`, `Client/src/pages/vendor/VendorFinance.jsx` | Separate wallet statement, order-date assessment and posted commission invoice with reversal lines; Dhaka month boundaries, explicit 5000-entry limits and web/native PDF. | Signed-in print/share acceptance, legacy reconciliation and shipping/tax document scope. Generated commission invoices are not statutory VAT invoices. |

## Commission assessment export

- `GET /api/v2/vendor/finance/charges` returns own-vendor order-created-month assessments, not a tax invoice or settlement. It has finance permission checks, no-store responses, Dhaka boundaries, a repeatable-read snapshot and explicit overflow/currency errors.
- Vendor Finance offers web print/save and native PDF sharing beside the wallet statement. Every package is listed; cancelled/rejected packages are excluded from the commission total. HTML escapes dynamic fields and preserves bigint precision.
- The posted commission invoice now reads immutable settlement commission snapshots and refund commission reversals by posting month. Seller net refund and commission reversal use cumulative integer allocation. Shipping costs, discount funding, refund principal and payout transfers are not relabeled as commission. Statutory tax documents and historical reconciliation remain separate scope; see `marketplace-launch-checklist.md`.
- Four new service tests cover authorization, boundaries, exclusions, precision, 101 rows, overflow, mixed currency and empty/missing vendors; the HTML test covers escaping, labeling and exact amounts.

## Web print correction

- Removed screen-wide print CSS from fulfillment/batch screens. It could conflict with other mounted routes and scroll-container layouts.
- Web now captures the rendered QR, generates the same HTML as native, waits for images to decode and prints a separate sandboxed frame. The frame is removed on completion/failure, with bounded load/cleanup timeouts.
- Missing/broken QR data blocks export; no QR-less label is silently printed.
- Single-package web users now have a packing-slip action in addition to the thermal label action.

## Automated verification

- Monthly statements: four service tests cover month boundaries, authorization, more than 100 entries, integer precision, overflow rejection and empty wallets; HTML test covers escaping, negative balances and document labeling. Ledger reads share a repeatable-read snapshot. Exports above 5000 rows fail explicitly instead of silently truncating.

- Mobile suite: 21 passing tests, including assessment/posted commission/statement HTML, missing QR, frame isolation, decode-before-print and image failure cleanup. DOM tests use controlled mocks; they are not real-browser print acceptance.
- Full workspace/repository suite passed, including all 89 repository checks.
- Mobile type-check, Expo web export and secret scan passed.

Do not treat this document as complete customer/vendor/admin reference acceptance. Live payment/refund/payout, real devices and full visual comparison remain separate gates.
