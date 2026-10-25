# Amiyo-Go Decisions Needed

These decisions block production implementation. Do not guess them in code.

| Decision | Status | Needed Answer |
|---|---|---|
| App name | IMPLEMENTED | Expo and release configuration use `Amiyo-Go`. |
| Android package ID | IMPLEMENTED | Expo release configuration uses `com.amiyo.go`. |
| iOS bundle ID | IMPLEMENTED | Expo release configuration uses `com.amiyo.go`. |
| Supported countries | IMPLEMENTED | Bangladesh only for release one; address/serviceability uses the admin-controlled village operation model in `release-one-operating-policy.md`. |
| Languages | IMPLEMENTED | English is the release-one operational UI. Bangla is supported for the village banner, bilingual learning content, Bengali input and persisted locale metadata; full-app Bangla translation is explicitly outside release-one scope. |
| Currency and rounding | IMPLEMENTED | BDT only; financial writes and calculations use integer minor units, with formatting at the presentation edge. |
| Release-one roles | IMPLEMENTED | Customer, vendor owner/manager/staff, support agent, finance admin, operations admin, and super admin are the approved bounded roles. |
| Guest checkout | IMPLEMENTED | Enabled through Firebase anonymous identity with normal protected customer scope; no unauthenticated order-write endpoint. |
| Authentication | IMPLEMENTED | Firebase Email/Password, Google and Anonymous guest identity are the approved release-one methods; password reset, persistent native sessions, revoked-token verification and server role synchronization are implemented. Phone OTP and additional social providers are outside scope. Production credentials and provider enablement remain deployment evidence. |
| Product approval | IMPLEMENTED | Vendor draft/rejected products can be submitted; admin-only review approves or rejects with versioned moderation and audit evidence. |
| Inventory policy | IMPLEMENTED | Admin controls a 5-120 minute unpaid reservation window; overselling prevention is mandatory, backorders are disabled, and the worker atomically expires unpaid holds with audit/outbox evidence. |
| Order split | IMPLEMENTED | One parent order and one vendor/shop package per participating vendor, as defined in `release-one-operating-policy.md`. |
| Commission | IMPLEMENTED | Global, category, vendor, and vendor-category percentage/fixed rules with effective dates and checkout snapshots. |
| Payments | IMPLEMENTED | Cash on Delivery and SSLCommerz hosted checkout are the only release-one customer methods. Card/mobile banking remains inside SSLCommerz; direct/manual bKash, Nagad and payment-proof checkout are disabled. Live credentials and provider evidence remain production promotion gates. |
| Refunds | IMPLEMENTED | Provider-reference rules, full/partial bounds, role approvals, and ledger timing are defined in `docs/business-rules-approval.md`; live provider evidence remains required before production. |
| Cancellation | IMPLEMENTED | Admin-controlled 5-1440 minute customer window, bounded fulfillment states, structured customer reasons, privileged admin override, durable replay and audit/refund evidence. |
| Returns | IMPLEMENTED | All approved categories share evidence-based damaged/defective/wrong-item/other eligibility; changed-mind is excluded and eligible returns have zero restocking fee. |
| Delivery | IMPLEMENTED | Amiyo Delivery is the preferred automatic dispatch integration when configured. Operations may assign active external couriers or pickup staff through the audited manual fallback. Admin-managed pickup points support customer selection, zero-fee quote validation and immutable order snapshots; physical counter custody remains manual. |
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
| Data retention | PARTIAL | Ephemeral schedules are worker-enforced. `data-retention-policy.md` defines a conservative long-lived baseline, hold precedence and provider checklist; production still requires named privacy/legal, finance, operations and security approval plus purge/provider evidence. |
| Account deletion | IMPLEMENTED | After the 30-day recovery window, the worker deletes the Firebase identity, anonymizes direct profile/contact/address data, revokes sessions/devices/alerts, and retains only the authentication tombstone plus records governed by the separate retention decision. Provider failures roll back and retry safely. |
| Migration cutover | IMPLEMENTED | Two-hour low-traffic maintenance window, maximum 45-minute Mongo write freeze, approval-gated traffic switch, 30-minute rollback-decision window and seven-day restricted read-only legacy window are defined in the cutover runbook. |
| Migration exports | IMPLEMENTED | Not applicable to the greenfield release: sibling `Client/Server` data is reference-only and is not imported. Any future legacy import is a separately approved migration project requiring sanitized exports, full mapping, two rehearsals and reconciliation. |
| Object storage | Firebase Storage selected | Authenticated 10-minute V4 signed uploads, private evidence prefixes, public marketplace prefixes, worker content validation, and optional CDN base are implemented. Production service-account IAM and bucket CORS remain operator configuration. |
| Deployment targets | IMPLEMENTED | Render Singapore hosts API/worker and server logs/alerts; Neon hosts PostgreSQL; Render Key Value provides Redis; Expo EAS builds mobile; Firebase provides Auth/Storage; Sentry monitors mobile. External provisioning and release evidence remain promotion gates. |

## Immediate Security Decision

Rotate the Neon PostgreSQL password that was pasted into chat. The rebuild should use:

- `DATABASE_URL` for pooled runtime traffic.
- `DIRECT_URL` for Prisma migrations only.
- No real value committed to Git or printed in logs.
