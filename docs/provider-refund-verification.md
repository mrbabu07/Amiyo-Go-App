# Provider refund safety verification

## Corrected behavior

Previously provider initiation fed directly into local completion. SSLCommerz distinguishes initiation from confirmed refund completion. The order and return completion paths now verify status, refund reference and the original bank transaction before changing ledger/payment state.

Initiation has a durable order/version reservation and payload hash. Completed initiation responses are persisted and reused. Unknown outcomes are not retried automatically, and another order version cannot initiate while an earlier provider request remains unreconciled. This prioritizes avoiding duplicate money transfers over automatic recovery.

The gateway also formats payment/refund amounts with integer arithmetic and rejects lookalike redirect hosts such as `evilsslcommerz.com`.

## Tests and limits

Targeted tests cover provider processing/success/cancelled/failed states, reference/bank mismatch, no ledger writes on pending evidence, persisted reference reuse, conflicting payloads, new-version pending requests, ambiguous timeout, large money values and redirect host boundaries.

Verification: 12 targeted tests passed; full workspace tests and all 89 repository checks passed. Build, secret scan and nine read-only marketplace smoke checks passed. The unrelated local mobile tsconfig change was preserved.

No real refund or payout was executed. Mocked provider responses are not live gateway acceptance. Operator-assisted reference recovery, manual amount reconciliation, concurrent staging requests and signed-in UI acceptance remain required. Unknown initiation reservations deliberately remain blocked until reviewed; no reservation-delete shortcut is provided.
