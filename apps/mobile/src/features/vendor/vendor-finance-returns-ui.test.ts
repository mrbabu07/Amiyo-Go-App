import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const root = resolve(import.meta.dirname, "../../..");
const finance = readFileSync(resolve(root, "src/features/operations/VendorFinanceScreen.tsx"), "utf8");
const operationsApi = readFileSync(resolve(root, "src/features/operations/operations.api.ts"), "utf8");
const payoutAttempt = readFileSync(resolve(root, "src/features/operations/vendor-payout-attempt.ts"), "utf8");
const payoutRecovery = readFileSync(resolve(root, "src/features/operations/pending-vendor-payout.ts"), "utf8");
const returns = readFileSync(resolve(root, "src/features/vendor/VendorReturnsScreen.tsx"), "utf8");
const returnDetail = readFileSync(resolve(root, "src/features/operations/ReturnDetailScreen.tsx"), "utf8");

test("seller finance wires a real idempotent payout workflow", () => {
  assert.match(operationsApi, /requestVendorPayout/);
  assert.match(operationsApi, /Idempotency-Key/);
  assert.match(finance, /createVendorPayoutAttempt\(Crypto\.randomUUID\)/);
  assert.match(finance, /payoutAttempt\.submit\(identity/);
  assert.match(payoutAttempt, /attempts\.get\(identity\)/);
  assert.match(payoutAttempt, /if \(attempt\.pending\) return attempt\.pending/);
  assert.match(operationsApi, /pendingVendorPayoutStore\.prepare/);
  assert.match(operationsApi, /pendingVendorPayoutStore\.complete/);
  assert.match(payoutRecovery, /earlier payout needs recovery/);
  assert.match(finance, /bankAccountId: destination/);
  assert.match(finance, /Retry original payout/);
  assert.match(finance, /Payout requests are safely paused/);
  assert.match(finance, /recovered\?\.input\.amountMinor/);
  assert.match(finance, /Payout amount in BDT/);
  assert.match(finance, /Current payout policy/);
  assert.match(finance, /payoutPolicy\.minimum\.amountMinor/);
  assert.match(finance, /payoutPolicy\.holdDays/);
  assert.match(finance, /payoutPolicy\.cadenceDays/);
  assert.match(finance, /Submit payout request/);
  assert.match(finance, /queryKey: \["vendor-finance", user\?\.uid\]/);
});

test("seller finance exposes reference navigation and ledger evidence", () => {
  for (const label of ["Overview", "Reconciliation", "Payouts", "Transactions", "Statements", "Commissions"]) assert.match(finance, new RegExp(label));
  for (const label of ["Recent transactions", "Payout history", "AVAILABLE FOR PAYOUT"]) assert.match(finance, new RegExp(label));
  assert.match(finance, /compact && styles\.statsCompact/);
  assert.match(finance, /compact && styles\.statCompact/);
  assert.match(finance, /compact && styles\.columnsCompact/);
  assert.match(finance, /flexBasis: "47%"/);
  assert.match(finance, /columnsCompact: \{ flexDirection: "column", flexWrap: "nowrap" \}/);
  assert.doesNotMatch(finance, /Â|Ã|à§|â†|â€œ|â€/);
});

test("seller returns exposes searchable operational workflow", () => {
  assert.match(returns, /Search seller returns/);
  for (const status of ["REQUESTED", "REVIEWING", "APPROVED", "RECEIVED", "REFUND_PENDING", "CLOSED", "REJECTED"]) assert.match(returns, new RegExp(status));
  for (const label of ["Need attention", "APPROVED DEDUCTIONS", "Review and respond"]) assert.match(returns, new RegExp(label));
  assert.match(returns, /queryKey: \["vendor", "returns", user\?\.uid\]/);
  assert.doesNotMatch(returns, /Â|Ã|à§|â†|â€œ|â€/);
});

test("seller return detail is responsive and uses the marketplace palette", () => {
  assert.match(returnDetail, /useWindowDimensions\(\)\.width < 620/);
  assert.match(returnDetail, /compact && styles\.columnsCompact/);
  assert.match(returnDetail, /compact && styles\.metricCompact/);
  assert.match(returnDetail, /compact && styles\.actionCardCompact/);
  assert.match(returnDetail, /compact && styles\.evidenceHeaderCompact/);
  assert.doesNotMatch(returnDetail, /#fff\b|#f8fafc|#ffedd5/i);
});
