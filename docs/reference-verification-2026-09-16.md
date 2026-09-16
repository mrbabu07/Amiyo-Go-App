# Reference verification — 2026-09-16

## Scope

This pass compares order documents with the legacy implementation. It does not certify every marketplace screen or production integration.

Reference evidence: `Client/src/utils/vendorOrderDetail.js` sets collection to zero for collected COD; `Server/routes/orderRoutes.js` exposes an admin invoice regeneration action.

## Changes

- Paid/refunded COD and cancelled/rejected packages show zero collection. Pending COD uses the selected seller package total, not the parent multi-store total. The dispatch snapshot uses the same calculation.
- Customer order/invoice responses carry the seller shipment reference through the contract.
- Admins with `admin:manage` can issue a missing invoice. The invoice identity is retained on repeat requests and issuance writes an audit record in the same transaction. Print is unavailable until an invoice exists.
- OpenAPI documents the new admin operation.
- Native seller documents now export a signed-QR parcel PDF (100 x 150 mm) or an A4 packing slip with seller-package items and totals, rather than sharing a text-only summary. Web retains its thermal print view.
- Native invoice and fulfillment exports fail visibly if the QR is unavailable, invalid or does not render within five seconds. Sharing falls back to the native print dialog when sharing is unavailable.
- Seller orders support selecting up to 20 packages and preparing either thermal labels or A4 packing slips. Each document is fetched through the existing ownership-checked endpoint; a failed fetch prevents a partial batch. Selection changes discard the old preview. Native export combines documents into one PDF; web exposes a batch print preview.
- Browser inspection found unreadable dark-mode hero/logo text and overlapping mobile hero actions/statistics. Text colors and mobile flow layout were corrected. Theme switching now handles an inherited dark system theme.

## Verification

- Workspace build and mobile type-check passed.
- The mobile suite includes eight passing tests, covering thermal/A4 markup, escaped customer/product text, collection balance, missing/unsafe QR rejection, ordered/deduplicated batches, selection bounds and failed-fetch handling. These test generated markup, not device PDF rendering.
- Expo web export and mobile type-check passed after the changes. The full workspace/repository suite passed; focused theme and mobile checks were rerun after the visual fixes.
- Browser access became available during this follow-up. The exported home shell was inspected at 360px in dark mode and desktop in light mode. The corrected mobile hero has readable text and separated action/stat rows. API data was unavailable in this static preview; authenticated batch printing, live products and complete reference visual parity were not validated.
- Seven focused service/domain tests passed: package scope, collected COD, other-seller denial, admin permission and transactional issuance contract.
- Firebase Auth emulator E2E passed signup/token verification and invalid-token rejection. This does not validate Google/phone login or production credentials.
- Expo web export passed; this is a bundling check, not visual acceptance.
- Secret scan passed. The workspace lint command exits successfully but only invokes configured lint scripts.
- Full `npm test` covers workspace unit tests and repository checks, including isolated PGlite database constraints. Source-presence checks do not establish working browser journeys.

## Still required

- Browser screenshots/interactions against the reference at mobile/tablet/desktop sizes.
- Real Android/iOS scanning, permission handling, PDF sharing and physical print/QR readability.
- Staging multi-store purchase through delivery, partial return/refund and seller payout with real provider evidence.
- Load/security testing, deployment/backup drills and reconciliation approval.
- Complete reference inventory including seller tax invoices and document regeneration/storage semantics. Batch printing is implemented but still needs authenticated browser/native and physical-printer acceptance.

Do not describe the application as 100% reference-equivalent based on this report.
