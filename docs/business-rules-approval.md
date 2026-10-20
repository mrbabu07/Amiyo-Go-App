# Business Rules Approval Pack

Date: 2026-09-01
Scope: refunds, promotion stacking, loyalty guardrails, payout settlement  
Status: implemented in code; live-provider rollout still requires staging evidence and operator credentials.

## Customer Cancellation Rules

- The default customer cancellation window is 30 minutes after order placement.
- Administrators may configure 5 to 1,440 minutes through versioned platform business rules.
- Customer cancellation remains limited to eligible parent and seller-fulfillment states; administrative cancellation follows the separate privileged workflow.
- Changing the rule affects future eligibility checks and does not bypass idempotent replay of an already committed cancellation.

## Refund Provider Rules

- Gateway payments through SSLCommerz, bKash, or Nagad require a provider refund reference before an admin refund can be marked completed.
- COD/manual/wallet refunds are reconciled through the marketplace ledger and do not require a gateway reference.
- Unknown payment providers default to provider-evidence-required until the provider is explicitly classified.
- Refunds remain bounded by captured payment minus already-refunded amount.
- Admin can require provider evidence and enable/disable partial refunds through versioned platform rules.
- Seller wallet debits and finance ledger entries are created proportionally by vendor-order value.

## Promotion and Loyalty Rules

- Checkout applies an eligible flash-sale price first, one explicit customer coupon or seller/platform voucher second, one best active automatic order promotion third, and loyalty credit last.
- Automatic promotion choice is deterministic by priority, then ID.
- Total promotion discount is bounded by the versioned cap, defaulting to 35% of cart subtotal.
- Coupon redemption records store only the coupon-funded portion after the cap.
- Loyalty earning is queued after the configured fraud hold; redemption has minimum/balance/payable caps; points expire; refunds reverse earned points and restore redeemed points proportionally.

## Payout Settlement Rules

- Vendor payout requests require a verified bank/MFS account.
- Minimum payout request amount is BDT 500.
- Admin payment completion requires payout status `APPROVED` or `PROCESSING`.
- Provider name and transaction reference are required before marking a payout paid.
- Rejected payout requests release the reserved seller balance back to the vendor wallet.
- Finance can build an auditable settlement proposal from approved, verified, hold-eligible payouts; proposal generation never marks a payout paid automatically.

## Required External Evidence Before Production Launch

- SSLCommerz live refund flow tested with real provider references.
- bKash/Nagad/manual refund scope approved or disabled in production payment settings.
- Payout provider/MFS/bank reference format confirmed with finance operations.
- Staging checkout confirms the 35% discount cap with coupon + automatic promotion.
- Finance owner signs off on refund reversal, payout settlement, and loyalty earning/redemption rates.

SSLCommerz refund implementation follows the official API documentation: https://developer.sslcommerz.com/doc/v4/
