# Marketplace launch checklist

## Implemented finance follow-up

- Refund completion records per-package gross allocations separately from customer refunds and wallet movements.
- Before settlement, refunds do not create fictitious seller wallet debt. A later approved settlement subtracts the cumulative allocated refund from seller net and earned commission.
- After settlement, cumulative integer arithmetic reverses seller net and platform commission proportionally. Rounding is recovered across successive refunds. Permanent refund/package keys prevent repeat effects inside the existing serializable transaction.
- Order-wide refunds distribute across remaining seller-package capacity in stable ID order; any excess is recorded separately as a platform refund allocation. A package-specific return targets that package. These are proportional financial allocations, not an item-level tax/shipping refund engine.
- The monthly commission invoice uses approved posting snapshots and commission reversals, including reversal-only months. It is separate from the order-date assessment and wallet statement. It explicitly is not a statutory VAT invoice or an additional payment demand.
- Legacy gross-debit records and unsupported legacy settlements stop automatic reconciliation; there is no silent migration or live backfill.

## Launch blockers: evidence required

| Priority | Work | Acceptance evidence |
| --- | --- | --- |
| P0 | Reconcile old balances and approve the proportional refund policy | Finance signs off opening wallets, commission, discounts, delivery-fee ownership and old refunds; no unexplained negative balances |
| P0 | Provider refund completion/reconciliation | Verified gateway success, failure, timeout, pending and replay cases; never equate initiation alone with completed refund |
| P0 | Real customer/vendor/admin journeys | Evidence for signup, stock contention, multi-store checkout, cancellation, partial return, settlement, payout, invoices and cross-role denials |
| P0 | Production identity/secrets | Emulator disabled, production domains/app registrations configured, previously shared private credentials rotated, no demo admin credentials enabled |
| P0 | Infrastructure/recovery | API, worker and Redis healthy; TLS, storage permissions, monitoring, backup restore and rollback demonstrated |
| P0 | Security/accessibility review | Role and object ownership, upload controls, rate limits, token revocation, audit access and mobile keyboard/screen-reader flows checked |
| P0 | Real-device and print acceptance | Android/iOS login, camera permission denial, QR scanning, push, PDF share and physical print tested |
| P0 | Operating policies | Owner-approved service area, fees, returns, cancellation, payout schedule, support escalation and privacy notices; tax-document requirements reviewed by the responsible professional |

This checklist is not a certification. Passing unit tests, type-check or a web export does not satisfy these gates.

## Village-first pilot

Start with one supported area and a manageable set of verified local sellers. Verify local addresses/landmarks, delivery zones, COD confirmation and pickup-point behavior already present in the app before expanding. Populate real product photos, variants, prices and stock; remove demo listings from the production catalog.

Assign real people to seller onboarding, delivery exceptions, COD reconciliation, complaints and payout review. Publish service hours and response targets. Track completed deliveries, failed COD, stock mismatch, refund turnaround, repeat orders and support backlog. Expand only after the operating team can resolve exceptions reliably.

## Improvements after launch gates

Prioritize observed pilot gaps: low-bandwidth image loading, Bengali-friendly copy/search, accessible address entry, verified reviews, inventory accuracy and customer support. Do not add new features merely to increase feature count. A feature inventory does not establish Daraz-scale reliability or marketplace quality.

## Primary technical references

- [OWASP ASVS](https://owasp.org/projects/asvs) provides verifiable application security controls; use it as a review checklist, not an automatic certification.
- [Firebase Authentication Emulator](https://firebase.google.com/docs/emulator-suite/connect_auth) documents emulator connection and production differences; emulator behavior does not prove production anti-abuse or rate-limit behavior.
- [SSLCommerz integration guide](https://developer.sslcommerz.com/doc/v4/) documents payment validation and IPN handling; verify server-side provider evidence before treating a transaction as successful.
