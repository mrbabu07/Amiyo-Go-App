# Finance refund and commission follow-up

## Behavior verified in automated tests

- Eighteen targeted API tests cover settlement authorization and holds, completed-refund deductions before settlement, admin multi-store refund, cumulative seller-net and commission reversal, replay, integer precision, remaining package capacity, legacy gross-debit rejection and commission-invoice scope/bounds.
- The invoice HTML regression covers escaping, exact signed money, empty periods and the warning not to pay already-deducted commission again.
- Order-level allocation records are analytical attribution, not additional customer payments. The customer refund ledger retains the full refund; vendor wallets reverse only approved seller net. The difference can include commission and platform-retained shipping, not necessarily commission alone.
- Report queries use Bangladesh posting-month boundaries and a repeatable-read snapshot. A reversal in a later month appears in that month's invoice even if no new settlements were approved that month.

## Deliberately not performed

Latest checks: full workspace tests and all 89 repository checks passed; mobile type-check, Expo web export, secret scan and nine read-only marketplace smoke checks passed. Release readiness remains blocked with 27 unresolved decisions across 16 checked files; this documentary count is not a missing-feature count or runtime health result.

No live provider refund, seller credit, payout, legacy migration or balance backfill was executed. Unit fixtures and schema regressions are not end-to-end accounting certification. No statutory VAT number or tax rate was fabricated.

## Release requirements

Run signed-in staging tests for simultaneous approval/refund, pending provider responses, provider success with database failure, retry after restart, legacy reconciliation, and actual PDF printing. Obtain finance approval of proportional refund allocation and any shipping-only/item-specific exceptions. See `marketplace-launch-checklist.md` for the full launch gate list.
