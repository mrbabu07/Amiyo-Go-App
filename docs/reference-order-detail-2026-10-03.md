# Customer order detail reference follow-up

Scope: local customer order UI, not deployment or native release approval.

Compared `Client/src/pages/OrderDetail.jsx` with the mobile customer detail screen. The reference renders delivery address and product images. The mobile API already returns the saved delivery address, latest payment and seller/shipment names, but the customer screen did not display those fields.

Implemented:

- Saved recipient, phone and complete address, without substituting a subsequently edited profile address.
- Payment method, provider, actual status, optional transaction reference and positive refund amount. Delivery status is not treated as proof of payment.
- Explicit empty states when address/payment records are missing.
- Shop/vendor names, package number, shipment status, carrier and tracking number where supplied.
- Full-width narrow-screen columns and a reactive current-user subscription, preserving UID-scoped order queries.

Two source-level regression tests cover field wiring, empty states and responsive column rules. These are not rendered UI or end-to-end tests.

Validation: restored missing dependencies with `npm ci --include=dev`; mobile type-check, all 45 mobile tests, secret scan and whitespace checks passed. npm reported blocked dependency install scripts; these checks do not verify Prisma engine generation or native builds after restoration. No browser screenshots or transactional E2E were collected in this update.

Image follow-up: the shared item contract now accepts an optional nullable thumbnail URL. The ownership-filtered customer detail query fetches one ordered product media entry per item without separate per-item queries. The customer UI displays the image with an accessible product name and a local fallback when absent or broken. Existing name, SKU, price and quantity snapshots are unchanged. Images are current catalog media, not historical purchase-time image snapshots; no database migration is involved.

Image validation: Prisma generation, workspace build, mobile type-check, 46 mobile tests and eight targeted order/document API tests pass. The API tests cover present/absent images, snapshot values and the ownership filter. Image rendering/failure tests on an actual browser/device remain open.

Full `npm test` also passed (workspace suites followed by 91 repository tests); secret scan and whitespace checks passed.

Still open: rendered mobile/desktop comparison, customer checkout/cancellation/return journeys, seller/admin acceptance and invoice/QR print checks. No claim of complete reference parity is made by this update.
