# Amiyo-Go Decisions Needed

These decisions block production implementation. Do not guess them in code.

| Decision | Status | Needed Answer |
|---|---|---|
| App name | IMPLEMENTED | Expo and release configuration use `Amiyo-Go`. |
| Android package ID | IMPLEMENTED | Expo release configuration uses `com.amiyo.go`. |
| iOS bundle ID | IMPLEMENTED | Expo release configuration uses `com.amiyo.go`. |
| Supported countries | IMPLEMENTED | Bangladesh only for release one; address/serviceability uses the admin-controlled village operation model in `release-one-operating-policy.md`. |
| Languages | TBD | Bangla, English, or both in release one. |
| Currency and rounding | IMPLEMENTED | BDT only; financial writes and calculations use integer minor units, with formatting at the presentation edge. |
| Release-one roles | IMPLEMENTED | Customer, vendor owner/manager/staff, support agent, finance admin, operations admin, and super admin are the approved bounded roles. |
| Guest checkout | IMPLEMENTED | Enabled through Firebase anonymous identity with normal protected customer scope; no unauthenticated order-write endpoint. |
| Authentication | PARTIAL | Firebase web project is configured locally. Confirm enabled email/password, phone OTP, social providers, test identities, and server Admin credentials. |
| Product approval | IMPLEMENTED | Vendor draft/rejected products can be submitted; admin-only review approves or rejects with versioned moderation and audit evidence. |
| Inventory policy | IMPLEMENTED | Admin controls a 5-120 minute unpaid reservation window; overselling prevention is mandatory, backorders are disabled, and the worker atomically expires unpaid holds with audit/outbox evidence. |
| Order split | IMPLEMENTED | One parent order and one vendor/shop package per participating vendor, as defined in `release-one-operating-policy.md`. |
| Commission | IMPLEMENTED | Global, category, vendor, and vendor-category percentage/fixed rules with effective dates and checkout snapshots. |
| Payments | PARTIAL | COD and validated SSLCommerz hosted sandbox checkout are implemented. Approve live credentials and final bKash, Nagad, card, and manual-proof scope. |
| Refunds | IMPLEMENTED | Provider-reference rules, full/partial bounds, role approvals, and ledger timing are defined in `docs/business-rules-approval.md`; live provider evidence remains required before production. |
| Cancellation | IMPLEMENTED | Admin-controlled 5-1440 minute customer window, bounded fulfillment states, structured customer reasons, privileged admin override, durable replay and audit/refund evidence. |
| Returns | IMPLEMENTED | All approved categories share evidence-based damaged/defective/wrong-item/other eligibility; changed-mind is excluded and eligible returns have zero restocking fee. |
| Delivery | IMPLEMENTED | Amiyo Delivery is the preferred automatic dispatch integration when configured. Operations may assign active external couriers or pickup staff through the audited manual fallback. Customer self-pickup and public pickup points are disabled for release one. |
| READY_TO_SHIP trigger | Implemented | Vendor transition emits one transactional outbox event with `delivery-create:<vendorOrderId>`; external credentials still require staging approval. |
| Vendor pickup address | IMPLEMENTED | Contact, Bangladesh phone, street/landmark, division, district and upazila are mandatory; union is optional unless the assigned route/provider requires it. |
| Rider contact exposure | IMPLEMENTED | Release-one customer tracking does not expose rider/staff identity or phone; assignment details remain permission-protected for operations. |
| Vendor payout | IMPLEMENTED | Verified bank/MFS, BDT 500 minimum, approved/processing-only settlement, provider reference, and reserve/release rules are defined in `docs/business-rules-approval.md`; payout schedule and live bank/MFS ops evidence remain required. |
| COD split collection | IMPLEMENTED | Customer COD is collected once against the parent payment after package delivery gates; package evidence and internal reconciliation remain separate. |
| Commission precedence | IMPLEMENTED | Product, shop, vendor-category, vendor, category, then global precedence; fixed fees apply once per selected vendor-order rule and approved proportional refunds reverse settlement consistently. |
| KYC | IMPLEMENTED | Private validated evidence, supported document types, audited admin review, mandatory rejection reason and fresh resubmission after rejection; expiry is manually reviewed for release one. |
| Geography | IMPLEMENTED | Bangladesh division/district/upazila/union taxonomy with server-authoritative admin base location, zone fees and serviceability estimates. |
| Notifications | IMPLEMENTED | Transactional in-app alerts are retained; supported push events honor customer/seller opt-outs; requested product alerts may use opt-in email; newsletter email requires explicit subscription; SMS and unimplemented transactional email are disabled for release one. Marketing is not sent through transactional push. |
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
