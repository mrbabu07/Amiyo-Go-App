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
| Monthly seller statement/tax invoice | `Server/controllers/vendor/vendorFinanceController.js:479`, `Client/src/pages/vendor/VendorFinance.jsx` | Dedicated period-based statement/tax-invoice export remains a gap. A packing slip is not a tax invoice. | Implement period contracts, vendor-owned ledger aggregation, export and reconciliation tests. |

## Web print correction

- Removed screen-wide print CSS from fulfillment/batch screens. It could conflict with other mounted routes and scroll-container layouts.
- Web now captures the rendered QR, generates the same HTML as native, waits for images to decode and prints a separate sandboxed frame. The frame is removed on completion/failure, with bounded load/cleanup timeouts.
- Missing/broken QR data blocks export; no QR-less label is silently printed.
- Single-package web users now have a packing-slip action in addition to the thermal label action.

## Automated verification

- Mobile suite: 18 passing tests, including missing QR, frame isolation, decode-before-print and image failure cleanup. DOM tests use controlled mocks; they are not real-browser print acceptance.
- Full workspace/repository suite passed, including all 89 repository checks.
- Mobile type-check, Expo web export and secret scan passed.

Do not treat this document as complete customer/vendor/admin reference acceptance. Live payment/refund/payout, real devices and full visual comparison remain separate gates.
