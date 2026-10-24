# Release-One Operating Policy

Status: Approved for the village-first pilot  
Effective: 2026-10-24

This policy records the launch scope already enforced by the application. It does not approve live providers, production infrastructure, migration data, or statutory compliance.

## Market and money

- Release one serves Bangladesh only. Delivery addresses use the Bangladesh division, district, upazila and optional/required union model controlled by village-operation settings.
- Commerce, commission, settlement, refund and payout accounting use BDT only.
- Monetary values are stored and calculated as integer minor units. APIs do not accept floating-point money for financial mutations; presentation converts minor units at the edge.

## Language

- English is the release-one operational interface for customer, seller and admin workflows.
- Bangla is supported for the admin-selected village banner, bilingual customer/seller learning content, Bengali text input and persisted `bn` user locale metadata.
- The village language control changes the village banner only; it does not claim to translate the complete application.
- A complete Bangla interface is outside release-one scope and requires a versioned translation catalogue plus native-device acceptance before it can be advertised.

## Identities and roles

- Release-one roles are customer, vendor owner, vendor manager, vendor staff, support agent, finance admin, operations admin and super admin.
- Vendor memberships remain vendor-scoped. Platform roles do not grant access to another customer's or vendor's owned resources without the corresponding permission.
- Guest checkout is enabled through a Firebase anonymous identity. The anonymous principal receives the normal customer scope, and its protected cart/order can later be associated through the supported authentication lifecycle. No unauthenticated order-write endpoint is permitted.

## Orders

- A checkout creates one parent order and one vendor order per participating vendor/shop package.
- Inventory reservation, payment and customer totals belong to the parent order; fulfillment, delivery, seller documents, commission and settlement remain package-scoped.
- Backorders are disabled for release one. The configured unpaid reservation window releases abandoned stock atomically.
- Customer cancellation uses the admin-configured time window and only pre-fulfillment parent/package states. Customers select changed mind, ordered by mistake, wrong address, payment issue, duplicate order or other, and retain a bounded explanation in the durable replay request.
- Administrative cancellation is a separate privileged reason class and always requires an operational explanation. Customer requests cannot claim the administrative reason. The reason code and detail are retained in status, refund, outbox and audit evidence.

## Delivery and COD privacy

- Amiyo Delivery is the preferred automatic release-one dispatch provider when its API, integration token and webhook secret are configured. Missing credentials must appear as not configured in the operations readiness view and do not authorize a fake successful booking.
- Operations may use the audited manual fallback to assign an active courier partner or pickup staff member. External partners such as Pathao, Steadfast or RedX are manual assignments until their own provider readiness is configured and accepted in staging.
- Assignment does not prove pickup. Pickup, transit, delivery, failed-attempt and COD transitions remain separate version-checked operations with shipment events and audit evidence.
- Customer self-pickup and public pickup points are disabled for release one. Enabling either requires a versioned policy, serviceability, custody, notification and payment review rather than only turning on a client flag.
- Customer tracking exposes the courier/provider name, tracking reference, package state, public event description/location and timestamps. Release one does not expose rider or pickup-staff names, phone numbers, internal assignments or provider payloads to customers.
- Operations staff retain assignment details inside the permission-protected logistics workspace and audit trail.
- COD is authorized and collected once against the parent-order payment after every active package reaches the delivery gate. Package delivery evidence remains separate, but a seller package must not create or collect a second customer COD payment.
- Courier remittance and seller settlement may allocate the parent collection internally only after reconciliation; they do not represent additional customer collection.

## Geography and pickup addresses

- Release-one geography follows the Bangladesh hierarchy: division, district, upazila, then union. The checked-in taxonomy supplies selectable names; admin delivery settings define the operational base location, zone charges and estimates.
- Customer delivery requires division and district. When the admin enables village union enforcement, checkout additionally requires upazila and union before submission.
- Every seller pickup address requires contact name, Bangladesh mobile number, street/landmark address, division, district and upazila. Union remains optional because some courier pickup coverage is defined at upazila level; operations may require it before assigning a route where the selected provider needs it.
- Serviceability and pricing are server-calculated from the stored admin delivery settings. Client labels or free-text location claims are not authoritative delivery approval.

## Seller KYC

- A seller must submit at least one unique supported business/identity document through the private KYC upload purpose. Every submitted file must belong to the seller account, complete content validation and retain its checksum before it can enter review.
- Release-one accepted document types are trade license, owner NID front/back, bank proof and a bounded `OTHER` supporting-document category. Operations may request additional evidence from this list according to seller form and risk; the application does not pretend one document is legally sufficient for every business type.
- Only authorized administrators may open short-lived audited document links and move a submission through submitted, reviewing, approved or rejected states. Rejection requires a recorded reason.
- Document validity/expiry is manually checked during review for release one. An approved or in-review submission is locked; a rejected seller may create a fresh submission with corrected evidence. Automated expiry reminders are deferred until a legally approved document-age policy exists.

## Returns

- Every approved marketplace category uses the same release-one return eligibility. A delivered item may be requested within the admin-controlled 1-90 day window for damaged, defective, wrong-item or reviewed other issues; changed-mind returns are not accepted.
- Evidence can be required globally by the admin policy. Requested quantities cannot exceed the delivered quantity after active prior returns, and every request remains package/item scoped.
- Eligible release-one returns have zero restocking fee. The API rejects any non-zero restocking setting so operators cannot silently deduct a fee from defect or fulfillment-error refunds.
- Seller response, operations review, reverse logistics, inspection and refund are separate versioned states with reasons, evidence and audit history. Exceptions after the window require operations review rather than bypassing the customer endpoint.

## Catalog moderation

- Vendors create products as drafts and may submit draft or rejected products for review.
- Only platform administrators with `admin:manage` may approve or reject a submitted product. Approval publishes the product; rejection records the reason and returns it to the vendor correction workflow.
- Moderation transitions, actors, reasons and product versions are retained as audit evidence. Archived products are not silently republished.

## Commission precedence

- The active commission rule is selected per line in this order: product, shop, vendor plus category, vendor, category, global fallback.
- A fixed fee is charged once for each selected rule within a vendor order, while percentage commission uses the corresponding line subtotal. Total commission cannot exceed the vendor-order subtotal.
- Checkout stores the selected rule and calculation snapshot. Approved proportional refund allocations reduce unsettled seller earnings or create ledger-backed reversals after settlement, as documented in `business-rules-approval.md`.

## Notifications

- Transactional in-app notifications are the durable release-one record for supported customer, seller and operations events.
- Expo push is an optional convenience channel and follows customer or seller event preferences. The in-app inbox remains available after push opt-out or token revocation.
- Email is enabled only for customer-requested product alerts and separately subscribed newsletters. Both use explicit opt-in and existing preference or unsubscribe controls.
- SMS and all other transactional email events are disabled for release one. The API rejects unsupported channel selections instead of storing a preference that cannot be delivered.
- Promotional campaigns do not use transactional push. Scheduled newsletters with recipient snapshots are the approved marketing path, so release one does not require a separate marketing-push quiet-hours window.

## Account deletion execution

- A customer may cancel a deletion request during the fixed 30-day recovery window. After the deadline, the worker locks and completes each due request atomically.
- Completion clears stored email, phone, profile identity, avatar reference, preferences and delivery-address records; revokes refresh sessions, devices and push tokens; and disables product alerts.
- The internal user row and Firebase subject remain as an anonymized tombstone so a later token cannot recreate the deleted account or restore contact data. Commerce, finance, dispute, support and audit records remain linked to the opaque internal identifier until the final legal retention schedule is approved.
- Firebase-provider identity deletion and time-based cleanup of retained legal records remain production approvals. The application must not claim those external/provider steps have completed based only on database anonymization.

## Ephemeral data retention

- Expired idempotency receipts are removed after their explicit expiry time; clients must never retry an uncertain mutation after its documented recovery window.
- Successfully processed outbox events are retained for 30 days for operational diagnosis, then removed. Pending, processing or failed events are never age-purged by this policy.
- Expired refresh-session rows are retained for a 30-day investigation buffer, then removed. Revocation remains immediate at the authorization layer.
- Delivered, failed or read notification-delivery logs are retained for 90 days, then removed. Pending deliveries are excluded from age cleanup.
- Orders, payments, refunds, settlements, payouts, returns, disputes, audit logs, KYC/payment/return evidence and provider callbacks are not covered by this ephemeral policy. Their periods require named legal, finance, privacy and operations approval.

## Change control

Changing country, currency, role, guest-checkout identity, or order-split policy requires a versioned product/operations decision, contract and migration review, updated tests, and release-owner approval. Admin settings may control operational parameters only within these approved boundaries.
