# Vendor order batching — 2026-10-03

## Change

The vendor order list first fetches the same scoped, newest-first set of up to 100 packages with shops and items. It then concurrently fetches three bounded relation branches: unique parent orders with customer/address/latest payment data, shipments with chronological events, and latest dispatches for those package IDs. Maps reconnect records while preserving the initial list order and existing DTO conversion.

Shared parent orders are deduplicated. No per-package database loop was added. Dispatch selection still uses `take: 1` per package, not an unbounded history fetch. Shipment lookup relies on the existing unique `Shipment.vendorOrderId` schema constraint. Empty lists return before relation queries. Missing parent orders fail with a retryable 503 rather than returning incomplete data.

Ownership/status filtering, elevated access, permission guards, response contracts and the 100-package limit remain unchanged. There is no migration, credential change or cross-request data cache. These multi-query reads are not a transactional snapshot, as with the previous relation loading; connection-pool behavior under load remains unverified.

## Verification

- Full build and `npm test` passed, including 91 repository script checks.
- Added deterministic regression coverage that all three relation branches start concurrently, parent IDs are deduplicated, package IDs are scoped, latest payment/dispatch and chronological event rules remain intact, and list DTOs exactly match detail DTOs.
- Existing unauthorized, suspended, elevated and cross-vendor access tests remain passing.
- Read-only comparison of the existing vendor's eight packages: complete response deep-equality passed against the previous nested-include result.
- That comparison observed 6,220 ms for the previous list read and 3,647 ms for the batched read. This is a small local API/remote database observation with other checks running, not a controlled benchmark or production SLA.
- Secret scan and whitespace checks passed.
- Authenticated runtime smoke on the rebuilt API at temporary port 4010: all 28 checks passed with no skips. Vendor list HTTP time including authentication was 6,248 ms; timed-request median was 2,902 ms and maximum 8,917 ms. End-to-end latency still needs improvement.

Further work remains for load/pool testing, other slow endpoints, browser/device verification and real provider configuration. Reference parity and production readiness are not certified by this change.
