# Seller settlement approval

## Implemented scope

`POST /api/v2/admin/vendor-orders/{id}/settlement` requires an active SUPER_ADMIN or FINANCE_ADMIN with `finance:manage`. The Admin Order Details panel provides the approval controls.

The request includes the package version, explicit shipping recipient, reconciled expected amount in minor units, and an approval reason. Net credit is subtotal minus order discount minus commission, plus delivery only when explicitly assigned to the vendor. Amount mismatch blocks approval; discounts and fees are not guessed or silently adjusted.

The package must be delivered, payment fully captured, and refund/return history clear (rejected returns are allowed). COD requires exact collection and a zero-variance reconciled remittance. Both the configured hold after confirmed delivery and the recorded return window must have expired. Missing dates block approval.

The credit uses `order-settlement:{vendorOrderId}` as a permanent unique key, inside a serializable transaction with existing conflict retries. Repeat approval returns the existing entry without another credit. Audit and credit are committed together. Approval never calls a payout provider or automatically credits historical packages.

## Verification and limits

Service tests cover permissions, replay, net amount, shipping approval, exact integers, stale versions, delivery/payment/refund/return gates, COD remittance, missing evidence and hold dates. Database unique-key coverage exists in the finance regression suite. Unit fixtures do not prove live concurrent API behavior or provider reconciliation.

Verification: six settlement service tests passed, full workspace/repository regression passed (89 repository checks), mobile type-check and Expo web export passed, secret scan passed, and nine read-only marketplace smoke checks passed. The smoke run did not approve or credit any real order.

Refunded/returned orders and post-settlement commission reversals remain a separate reconciliation gap. Existing refund debits are not replaced by this change. Platform-funded discounts and legacy settlement credits require finance review before migration/backfill. This is not complete reference finance parity or a statutory tax invoice.

No live settlement or payout was executed as part of implementation. Signed-in staging approval, repeat-request concurrency, and printed/exported receipt acceptance still need end-to-end evidence.
