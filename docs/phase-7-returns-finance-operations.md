# Phase 7: Returns, Finance, and Operations

## Acceptance gate

Financial invariants and reconciliation tests must pass. All order, refund, payout, and COD mutations use serializable transactions and UUID idempotency keys.

## Delivered

- Customer order cancellation releases active inventory reservations, records status history, creates a pending refund for captured payments, and emits audit/outbox records.
- Delivered-order return requests validate ownership, item quantities, and authoritative integer-minor-unit amounts.
- Admin return transitions use optimistic concurrency. Refund completion requires an external provider reference before payment and append-only ledgers are updated.
- Vendor balance is derived from append-only credit/debit entries. Payout requests immediately reserve funds to prevent concurrent overdraw; rejection releases the reservation.
- Finance admins review and complete payouts, reconcile COD collections by period, and inspect financial audit activity.
- Customer, vendor, and admin mobile views expose return status, ledger/payout status, and operations queues.

## Safety boundaries

- Unapproved policy is not guessed. State-machine eligibility is the temporary technical boundary; production enablement remains blocked by the decisions in `docs/decisions-needed.md`.
- Payout completion and refund completion record a provider-confirmed reference. The application does not call an unapproved gateway.
- Wallet balances are never stored as mutable totals.

## Rollback

Deploy the previous API/mobile artifacts. The migration only adds payout review metadata and a bank-account foreign key; a forward migration may remove those fields after confirming no Phase 7 payout records depend on them. Financial ledger rows must never be deleted during rollback.
