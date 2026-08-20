# Amiyo-Go Decisions Needed

These decisions block production implementation. Do not guess them in code.

| Decision | Status | Needed Answer |
|---|---|---|
| App name | TBD | Confirm final app/store display name. |
| Android package ID | TBD | Example: `com.amiyo.go`. |
| iOS bundle ID | TBD | Example: `com.amiyo.go`. |
| Supported countries | TBD | Bangladesh only or additional countries. |
| Languages | TBD | Bangla, English, or both in release one. |
| Currency and rounding | TBD | Confirm BDT-only and minor-unit rounding policy. |
| Release-one roles | TBD | Confirm customer, vendor owner/manager/staff, support, finance, operations, super admin. |
| Guest checkout | TBD | Enabled/disabled and account-linking behavior. |
| Authentication | PARTIAL | Firebase web project is configured locally. Confirm enabled email/password, phone OTP, social providers, test identities, and server Admin credentials. |
| Product approval | TBD | Draft/submitted/approved/rejected transitions and owner actions. |
| Inventory policy | TBD | Reservation duration, overselling, backorder rules. |
| Order split | Proposed | One parent order and one vendor order per vendor. Needs approval. |
| Commission | IMPLEMENTED | Global, category, vendor, and vendor-category percentage/fixed rules with effective dates and checkout snapshots. |
| Payments | PARTIAL | COD and validated SSLCommerz hosted sandbox checkout are implemented. Approve live credentials and final bKash, Nagad, card, and manual-proof scope. |
| Refunds | IMPLEMENTED | Provider-reference rules, full/partial bounds, role approvals, and ledger timing are defined in `docs/business-rules-approval.md`; live provider evidence remains required before production. |
| Cancellation | TBD | Allowed states and actor-specific reason list. |
| Returns | TBD | Window, eligibility, evidence, pickup, refund order. |
| Delivery | TBD | Amiyo Delivery, external courier, self pickup, manual fallback. |
| READY_TO_SHIP trigger | Implemented | Vendor transition emits one transactional outbox event with `delivery-create:<vendorOrderId>`; external credentials still require staging approval. |
| Vendor pickup address | TBD | Confirm required phone/address/geography fields stored in shop settings before production dispatch. |
| Rider contact exposure | TBD | Confirm whether customer tracking may display rider name and masked phone. |
| Vendor payout | IMPLEMENTED | Verified bank/MFS, BDT 500 minimum, approved/processing-only settlement, provider reference, and reserve/release rules are defined in `docs/business-rules-approval.md`; payout schedule and live bank/MFS ops evidence remain required. |
| COD split collection | TBD | Confirm whether one parent payment is collected once or each vendor shipment records a separate COD collection. Automatic delivery settlement remains disabled until approved. |
| Commission precedence | PARTIAL | Checkout uses vendor-category, vendor, category, then global precedence; fixed fees apply once per matched vendor order. Refund reversal remains a settlement decision. |
| KYC | TBD | Required documents, expiry, rejection/resubmission workflow. |
| Geography | TBD | Division/district/upazila/union and serviceability source. |
| Notifications | PARTIAL | In-app and Expo Push are implemented through transactional outbox/BullMQ delivery. Approve any release-one SMS/email events, quiet hours, and opt-out policy. |
| Push provider | Expo Push selected | Native token registration, durable retries, delivery status and revoked-device filtering are implemented. EAS/FCM/APNs project credentials remain operator configuration. |
| Newsletter email | Resend selected | Drafts, schedules, recipient snapshots, unsubscribe links, durable retries, and delivery counters are implemented. `EMAIL_PROVIDER_TOKEN` and `EMAIL_FROM` remain operator configuration. |
| Loyalty | TBD | Approve earning rates, tiers, expiry, redemption value, reversals, and fraud holds before points mutations are enabled. |
| Promotion stacking | IMPLEMENTED | Checkout applies one coupon plus one deterministic automatic promotion with a 35% subtotal cap; voucher/flash-sale product-level precedence and staging evidence remain required before production launch. |
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
