# Amiyo-Go Decisions Needed

These decisions block production implementation. Do not guess them in code.

| Decision | Status | Needed Answer |
|---|---|---|
| App name | IMPLEMENTED | Expo and release configuration use `Amiyo-Go`. |
| Android package ID | IMPLEMENTED | Expo release configuration uses `com.amiyo.go`. |
| iOS bundle ID | IMPLEMENTED | Expo release configuration uses `com.amiyo.go`. |
| Supported countries | TBD | Bangladesh only or additional countries. |
| Languages | TBD | Bangla, English, or both in release one. |
| Currency and rounding | TBD | Confirm BDT-only and minor-unit rounding policy. |
| Release-one roles | TBD | Confirm customer, vendor owner/manager/staff, support, finance, operations, super admin. |
| Guest checkout | TBD | Enabled/disabled and account-linking behavior. |
| Authentication | PARTIAL | Firebase web project is configured locally. Confirm enabled email/password, phone OTP, social providers, test identities, and server Admin credentials. |
| Product approval | TBD | Draft/submitted/approved/rejected transitions and owner actions. |
| Inventory policy | IMPLEMENTED | Admin controls a 5-120 minute unpaid reservation window; overselling prevention is mandatory, backorders are disabled, and the worker atomically expires unpaid holds with audit/outbox evidence. |
| Order split | Proposed | One parent order and one vendor order per vendor. Needs approval. |
| Commission | IMPLEMENTED | Global, category, vendor, and vendor-category percentage/fixed rules with effective dates and checkout snapshots. |
| Payments | PARTIAL | COD and validated SSLCommerz hosted sandbox checkout are implemented. Approve live credentials and final bKash, Nagad, card, and manual-proof scope. |
| Refunds | IMPLEMENTED | Provider-reference rules, full/partial bounds, role approvals, and ledger timing are defined in `docs/business-rules-approval.md`; live provider evidence remains required before production. |
| Cancellation | PARTIAL | Customer window is admin-controlled (5-1440 minutes), versioned and enforced against placement time; allowed fulfillment states are enforced. Final actor-specific reason taxonomy still requires approval. |
| Returns | PARTIAL | Admin-controlled window/evidence rules, delivered-order eligibility, bounded reason taxonomy, item quantities, reverse logistics and refund sequencing are implemented. Final category eligibility and restocking-fee reason policy require approval. |
| Delivery | TBD | Amiyo Delivery, external courier, self pickup, manual fallback. |
| READY_TO_SHIP trigger | Implemented | Vendor transition emits one transactional outbox event with `delivery-create:<vendorOrderId>`; external credentials still require staging approval. |
| Vendor pickup address | PARTIAL | Registration and shop settings now persist and validate dispatch-ready contact name, Bangladesh mobile, address, division, district and upazila; confirm whether union/area must be mandatory before production dispatch. |
| Rider contact exposure | TBD | Confirm whether customer tracking may display rider name and masked phone. |
| Vendor payout | IMPLEMENTED | Verified bank/MFS, BDT 500 minimum, approved/processing-only settlement, provider reference, and reserve/release rules are defined in `docs/business-rules-approval.md`; payout schedule and live bank/MFS ops evidence remain required. |
| COD split collection | TBD | Confirm whether one parent payment is collected once or each vendor shipment records a separate COD collection. Automatic delivery settlement remains disabled until approved. |
| Commission precedence | PARTIAL | Checkout uses vendor-category, vendor, category, then global precedence; fixed fees apply once per matched vendor order. Refund reversal remains a settlement decision. |
| KYC | TBD | Required documents, expiry, rejection/resubmission workflow. |
| Geography | TBD | Division/district/upazila/union and serviceability source. |
| Notifications | PARTIAL | In-app and Expo Push are implemented through transactional outbox/BullMQ delivery. Approve any release-one SMS/email events, quiet hours, and opt-out policy. |
| Push provider | Expo Push selected | Native token registration, durable retries, delivery status and revoked-device filtering are implemented. EAS/FCM/APNs project credentials remain operator configuration. |
| Newsletter email | Resend selected | Drafts, schedules, recipient snapshots, unsubscribe links, durable retries, and delivery counters are implemented. `EMAIL_PROVIDER_TOKEN` and `EMAIL_FROM` remain operator configuration. |
| Loyalty | IMPLEMENTED | Delayed earning, redemption cap/minimum, expiry, refund reversal, and redemption restoration are versioned admin rules. Finance approval and staging evidence remain required. |
| Promotion stacking | IMPLEMENTED | Checkout applies flash price, one coupon or voucher, one deterministic automatic promotion, then loyalty credit under a versioned cap. Staging margin evidence remains required. |
| Data retention | TBD | Per table/file/log retention periods. |
| Account deletion | TBD | Anonymization, legal retention, recovery window. |
| Migration cutover | TBD | Maintenance window, rollback duration, read-only Mongo window. |
| Migration exports | BLOCKED | Provide sanitized production-shaped exports for every legacy collection, expected row/money totals, two production-scale staging environments, and named reconciliation approvers. |
| Object storage | Firebase Storage selected | Authenticated 10-minute V4 signed uploads, private evidence prefixes, public marketplace prefixes, worker content validation, and optional CDN base are implemented. Production service-account IAM and bucket CORS remain operator configuration. |
| Deployment targets | TBD | API, worker, PostgreSQL, Redis, EAS, monitoring providers. |

## Immediate Security Decision

Rotate the Neon PostgreSQL password that was pasted into chat. The rebuild should use:

- `DATABASE_URL` for pooled runtime traffic.
- `DIRECT_URL` for Prisma migrations only.
- No real value committed to Git or printed in logs.
