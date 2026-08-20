# Business Rules Approval Pack

Date: 2026-08-21  
Scope: refunds, promotion stacking, loyalty guardrails, payout settlement  
Status: implemented in code; live-provider rollout still requires staging evidence and operator credentials.

## Refund Provider Rules

- Gateway payments through SSLCommerz, bKash, or Nagad require a provider refund reference before an admin refund can be marked completed.
- COD/manual/wallet refunds are reconciled through the marketplace ledger and do not require a gateway reference.
- Unknown payment providers default to provider-evidence-required until the provider is explicitly classified.
- Refunds remain bounded by captured payment minus already-refunded amount.
- Seller wallet debits and finance ledger entries are created proportionally by vendor-order value.

## Promotion and Loyalty Rules

- Checkout can apply one explicit customer coupon plus one best active automatic order promotion.
- Automatic promotion choice is deterministic by priority, then ID.
- Total stacked discount is capped at 35% of cart subtotal.
- Coupon redemption records store only the coupon-funded portion after the cap.
- Loyalty account and ledger are available, but automatic earning/redemption still requires a separate earning-rate, expiry, reversal, and fraud-hold approval before mutation is enabled.

## Payout Settlement Rules

- Vendor payout requests require a verified bank/MFS account.
- Minimum payout request amount is BDT 500.
- Admin payment completion requires payout status `APPROVED` or `PROCESSING`.
- Provider name and transaction reference are required before marking a payout paid.
- Rejected payout requests release the reserved seller balance back to the vendor wallet.

## Required External Evidence Before Production Launch

- SSLCommerz live refund flow tested with real provider references.
- bKash/Nagad/manual refund scope approved or disabled in production payment settings.
- Payout provider/MFS/bank reference format confirmed with finance operations.
- Staging checkout confirms the 35% discount cap with coupon + automatic promotion.
- Finance owner signs off on refund reversal, payout settlement, and loyalty earning/redemption rates.
