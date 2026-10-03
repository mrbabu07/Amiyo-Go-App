# Vendor order read follow-up — 2026-10-03

## Target and changes

The preceding local smoke observed `/api/v2/vendor/orders` at 9,103 ms and a customer request to a vendor order detail at 8,025 ms, even though the latter ultimately returned 403. These timings include authentication and remote database latency, not just order reads.

- Removed the unused `vendor` relation from the shared vendor-order include. DTO, document and dispatch code use `vendorId` and shop data, not the loaded vendor record. Orders, addresses, payment, customer profile, items, shipment events and dispatch status remain included.
- Reject inactive sessions, missing order-read permission and non-vendor/non-elevated detail/document readers before any order query.
- Preserve vendor list filtering and the 100-row bound. Active non-elevated readers with no vendor memberships receive an empty list without querying orders.
- Retain per-package ownership checks after retrieval for vendor users and existing SUPER_ADMIN/OPERATIONS_ADMIN access. Denying another vendor's package is still mandatory.

No API response contract, invoice calculation, QR payload, migration, credential or cross-request authorization cache was changed. Missing detail IDs for users without vendor access now return 403 before database lookup rather than exposing existence through 404/403 differences.

## Verification scope

Four regression tests cover early denial without a database client, list scope/status/limit and relation shape, elevated readers without memberships, and cross-vendor denial. Existing document tests continue to cover multi-store collection amounts, paid COD and another seller's document denial.

Build and full `npm test` passed, including the 91 repository script checks. Secret scan and diff whitespace checks passed. Authenticated smoke against the rebuilt API on temporary port 4010 passed all 28 checks without skips.

The observed vendor list request took 7,487 ms; the customer-to-vendor-detail denial took 1,438 ms. Timed-request median was 3,078 ms and maximum 10,858 ms. These are small sequential local/remote-database samples, not a controlled speedup benchmark. The denial path no longer loads order data, but authorized order-list performance still needs work and the maximum latency remains high.

This targeted change does not prove overall reference parity, production latency, load capacity or real provider readiness.
