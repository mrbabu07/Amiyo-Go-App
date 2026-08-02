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
| Authentication | TBD | Firebase email/password, phone OTP, social login, or mixed. |
| Product approval | TBD | Draft/submitted/approved/rejected transitions and owner actions. |
| Inventory policy | TBD | Reservation duration, overselling, backorder rules. |
| Order split | Proposed | One parent order and one vendor order per vendor. Needs approval. |
| Commission | TBD | Percentage/fixed rules, effective dates, product/category/vendor overrides. |
| Payments | TBD | COD, bKash, Nagad, SSLCommerz, cards, manual proof scope. |
| Refunds | TBD | Full/partial, gateway/manual, role approvals, ledger timing. |
| Cancellation | TBD | Allowed states and actor-specific reason list. |
| Returns | TBD | Window, eligibility, evidence, pickup, refund order. |
| Delivery | TBD | Amiyo Delivery, external courier, self pickup, manual fallback. |
| READY_TO_SHIP trigger | Implemented | Vendor transition emits one transactional outbox event with `delivery-create:<vendorOrderId>`; external credentials still require staging approval. |
| Vendor pickup address | TBD | Confirm required phone/address/geography fields stored in shop settings before production dispatch. |
| Rider contact exposure | TBD | Confirm whether customer tracking may display rider name and masked phone. |
| Vendor payout | TBD | Schedule, minimum balance, hold/dispute rules. |
| COD split collection | TBD | Confirm whether one parent payment is collected once or each vendor shipment records a separate COD collection. Automatic delivery settlement remains disabled until approved. |
| Commission precedence | TBD | Confirm vendor/category/global rule precedence, fixed-fee application unit, and refund reversal behavior before automatic vendor settlement. |
| KYC | TBD | Required documents, expiry, rejection/resubmission workflow. |
| Geography | TBD | Division/district/upazila/union and serviceability source. |
| Notifications | TBD | Push, in-app, SMS, email event matrix. |
| Push provider | TBD | Approve Expo Push/FCM/APNs routing, retries, quiet hours, and opt-out behavior. In-app delivery is enabled; push stays pending. |
| Loyalty | TBD | Approve earning rates, tiers, expiry, redemption value, reversals, and fraud holds before points mutations are enabled. |
| Promotion stacking | TBD | Approve coupon/voucher/promotion/flash-sale precedence and stacking before automatic checkout discounts are enabled. |
| Data retention | TBD | Per table/file/log retention periods. |
| Account deletion | TBD | Anonymization, legal retention, recovery window. |
| Migration cutover | TBD | Maintenance window, rollback duration, read-only Mongo window. |
| Object storage | TBD | Provider, bucket layout, CDN, signed upload/read policy. |
| Deployment targets | TBD | API, worker, PostgreSQL, Redis, EAS, monitoring providers. |

## Immediate Security Decision

Rotate the Neon PostgreSQL password that was pasted into chat. The rebuild should use:

- `DATABASE_URL` for pooled runtime traffic.
- `DIRECT_URL` for Prisma migrations only.
- No real value committed to Git or printed in logs.
