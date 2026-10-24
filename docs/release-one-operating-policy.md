# Release-One Operating Policy

Status: Approved for the village-first pilot  
Effective: 2026-10-24

This policy records the launch scope already enforced by the application. It does not approve live providers, production infrastructure, migration data, or statutory compliance.

## Market and money

- Release one serves Bangladesh only. Delivery addresses use the Bangladesh division, district, upazila and optional/required union model controlled by village-operation settings.
- Commerce, commission, settlement, refund and payout accounting use BDT only.
- Monetary values are stored and calculated as integer minor units. APIs do not accept floating-point money for financial mutations; presentation converts minor units at the edge.

## Language

- Bangla and English are the intended customer languages.
- The village-operation default locale is admin controlled. Full copy translation and native-device language acceptance remain launch evidence rather than a completed policy decision.

## Identities and roles

- Release-one roles are customer, vendor owner, vendor manager, vendor staff, support agent, finance admin, operations admin and super admin.
- Vendor memberships remain vendor-scoped. Platform roles do not grant access to another customer's or vendor's owned resources without the corresponding permission.
- Guest checkout is enabled through a Firebase anonymous identity. The anonymous principal receives the normal customer scope, and its protected cart/order can later be associated through the supported authentication lifecycle. No unauthenticated order-write endpoint is permitted.

## Orders

- A checkout creates one parent order and one vendor order per participating vendor/shop package.
- Inventory reservation, payment and customer totals belong to the parent order; fulfillment, delivery, seller documents, commission and settlement remain package-scoped.
- Backorders are disabled for release one. The configured unpaid reservation window releases abandoned stock atomically.

## Delivery and COD privacy

- Customer tracking exposes the courier/provider name, tracking reference, package state, public event description/location and timestamps. Release one does not expose rider or pickup-staff names, phone numbers, internal assignments or provider payloads to customers.
- Operations staff retain assignment details inside the permission-protected logistics workspace and audit trail.
- COD is authorized and collected once against the parent-order payment after every active package reaches the delivery gate. Package delivery evidence remains separate, but a seller package must not create or collect a second customer COD payment.
- Courier remittance and seller settlement may allocate the parent collection internally only after reconciliation; they do not represent additional customer collection.

## Geography and pickup addresses

- Release-one geography follows the Bangladesh hierarchy: division, district, upazila, then union. The checked-in taxonomy supplies selectable names; admin delivery settings define the operational base location, zone charges and estimates.
- Customer delivery requires division and district. When the admin enables village union enforcement, checkout additionally requires upazila and union before submission.
- Every seller pickup address requires contact name, Bangladesh mobile number, street/landmark address, division, district and upazila. Union remains optional because some courier pickup coverage is defined at upazila level; operations may require it before assigning a route where the selected provider needs it.
- Serviceability and pricing are server-calculated from the stored admin delivery settings. Client labels or free-text location claims are not authoritative delivery approval.

## Catalog moderation

- Vendors create products as drafts and may submit draft or rejected products for review.
- Only platform administrators with `admin:manage` may approve or reject a submitted product. Approval publishes the product; rejection records the reason and returns it to the vendor correction workflow.
- Moderation transitions, actors, reasons and product versions are retained as audit evidence. Archived products are not silently republished.

## Commission precedence

- The active commission rule is selected per line in this order: product, shop, vendor plus category, vendor, category, global fallback.
- A fixed fee is charged once for each selected rule within a vendor order, while percentage commission uses the corresponding line subtotal. Total commission cannot exceed the vendor-order subtotal.
- Checkout stores the selected rule and calculation snapshot. Approved proportional refund allocations reduce unsettled seller earnings or create ledger-backed reversals after settlement, as documented in `business-rules-approval.md`.

## Change control

Changing country, currency, role, guest-checkout identity, or order-split policy requires a versioned product/operations decision, contract and migration review, updated tests, and release-owner approval. Admin settings may control operational parameters only within these approved boundaries.
