# Data Retention Policy

Status: Release-one operational baseline; legal approval required before production  
Effective draft: 2026-10-24

This schedule is a technical operating baseline, not legal advice. A named privacy/legal approver must confirm statutory periods and provider-side deletion before production. Until that approval, long-lived regulated records are preserved rather than prematurely purged.

## Enforced ephemeral schedule

| Record | Retention | Enforcement |
|---|---:|---|
| Expired idempotency records | Through `expiresAt` | Worker deletes after expiry |
| Processed outbox events | 30 days after processing | Worker deletes only `processed`; pending/failed work is preserved |
| Expired refresh sessions | 30 days after expiry | Worker deletes expired sessions; account deletion revokes active sessions immediately |
| Terminal notification deliveries | 90 days | Worker deletes delivered, failed and read delivery attempts |
| Expired incomplete media tickets | 24 hours after ticket expiry | Worker removes storage objects and then conditionally deletes only `pending` rows |
| Rejected media uploads | 7 days after rejection record creation | Worker removes any residual object and then conditionally deletes only `rejected` rows |
| Account deletion recovery request | 30 days | User may cancel during recovery; worker executes after the deadline |

## Proposed regulated schedule

| Record class | Proposed retention trigger and period | Expiry action |
|---|---|---|
| Orders, invoices, payments, refunds, COD, commission, settlement and payouts | Seven years after financial completion | Controlled archive/purge after finance and legal approval |
| Returns, disputes, trust/safety and linked evidence | Seven years after case closure, or longer while a hold is active | Controlled purge of record and private evidence |
| Vendor KYC and payout-account evidence | Seven years after vendor relationship ends, or longer while a hold is active | Controlled purge by an authorized operator |
| Delivery events and provider callbacks | Seven years after order completion | Controlled archive/purge after reconciliation |
| Audit and security events | Seven years after event | Append-only archive, then controlled purge |
| Support and marketplace chat | Two years after thread closure, extended to the linked order/dispute period when applicable | Controlled purge with attachment cleanup |
| Wishlist, cart and non-financial preferences | Account lifetime; direct account data is removed during account deletion | Delete/anonymize with account lifecycle |
| Public reviews and Q&A | Marketplace lifetime unless moderated or removed under an approved request | Preserve public integrity; detach direct profile identity on deletion |

## Holds and deletion rules

- Fraud, dispute, chargeback, tax, court, regulator, security-incident or migration-reconciliation holds override every expiry date.
- A hold must identify scope, reason, owner, creation date, review date and release approver. It must never contain provider credentials or unnecessary customer data.
- No automated job deletes commerce, finance, KYC, evidence, support, audit or provider-callback records until the legal schedule and hold mechanism are approved and tested.
- Media cleanup never deletes `uploaded`, `processing`, or `ready` rows. Attached product, review, KYC, payment, return, and support files therefore remain governed by their parent record and hold schedule.
- Account deletion removes Firebase identity and direct profile/contact/address data after the recovery period. Retained regulated records remain linked only to the opaque internal user identifier.
- Provider-side retention for Firebase, SSLCommerz, Render, Neon, Redis, Sentry, Resend and delivery providers must be configured and evidenced separately.

## Production approval checklist

- Privacy/legal approver and approval date recorded.
- Finance approves seven-year financial retention and archive access.
- Operations approves dispute, delivery and support periods.
- Security approves audit retention, hold access and purge logging.
- Every provider's retention/export/deletion setting is recorded without secrets.
- Restore and purge drills prove held records survive and eligible records are removed without orphaning financial/audit evidence.
