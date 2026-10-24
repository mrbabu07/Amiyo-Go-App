import assert from "node:assert/strict";

const exactKeys = (value, name, allowed) => {
  assert.ok(value && typeof value === "object" && !Array.isArray(value), `${name} must be an object`);
  assert.deepEqual(Object.keys(value).sort(), [...allowed].sort(), `${name} contains missing or unsupported fields`);
};

const bounded = (value, name, pattern, maximum = 120) => {
  assert.equal(typeof value, "string", `${name} is required`);
  const normalized = value.trim();
  assert.ok(normalized.length > 0 && normalized.length <= maximum && !/[\r\n]/.test(normalized) && pattern.test(normalized), `${name} is invalid`);
  return normalized;
};

const instant = (value, name) => {
  const normalized = bounded(value, name, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/);
  const milliseconds = Date.parse(normalized);
  assert.ok(Number.isFinite(milliseconds), `${name} is invalid`);
  return { normalized, milliseconds };
};

const passed = (value, name) => assert.equal(value, true, `${name} must be confirmed`);
const hash = (value, name) => bounded(value, name, /^[0-9a-f]{64}$/i, 64).toLowerCase();

export const parseFinanceProviderEvidence = (source) => JSON.parse(source.replace(/^\uFEFF/, ""));

export function validateFinanceProviderEvidence(report, { expectedCommitSha, now = Date.now() } = {}) {
  exactKeys(report, "Evidence", ["schemaVersion", "environment", "commitSha", "apiRelease", "executedAt", "operator", "financeApprover", "sslcommerz", "payout", "promotion"]);
  assert.equal(report.schemaVersion, 1, "schemaVersion must be 1");
  assert.equal(report.environment, "staging", "Only staging evidence is accepted");
  const commitSha = bounded(report.commitSha, "commitSha", /^[0-9a-f]{40}$/i);
  if (expectedCommitSha) assert.equal(commitSha.toLowerCase(), bounded(expectedCommitSha, "expectedCommitSha", /^[0-9a-f]{40}$/i).toLowerCase(), "Evidence commit does not match the release commit");
  const apiRelease = bounded(report.apiRelease, "apiRelease", /^[0-9a-f]{40}$/i);
  const executedAt = instant(report.executedAt, "executedAt");
  assert.ok(executedAt.milliseconds <= now + 5 * 60 * 1000, "Finance evidence cannot be future dated");
  assert.ok(now - executedAt.milliseconds <= 14 * 24 * 60 * 60 * 1000, "Finance evidence is older than fourteen days");
  const operator = bounded(report.operator, "operator", /^[a-zA-Z0-9._ -]+$/, 80);
  const financeApprover = bounded(report.financeApprover, "financeApprover", /^[a-zA-Z0-9._ -]+$/, 80);
  assert.notEqual(operator.toLowerCase(), financeApprover.toLowerCase(), "Finance approval must be independent from execution");

  exactKeys(report.sslcommerz, "sslcommerz", ["mode", "checkout", "refund"]);
  assert.equal(report.sslcommerz.mode, "live", "SSLCommerz evidence must use live mode");
  exactKeys(report.sslcommerz.checkout, "sslcommerz.checkout", ["transactionHash", "captured", "callbackValidated", "callbackReplaySafe", "amountCurrencyMatched", "localLedgerReconciled"]);
  const checkoutTransactionHash = hash(report.sslcommerz.checkout.transactionHash, "sslcommerz.checkout.transactionHash");
  for (const field of ["captured", "callbackValidated", "callbackReplaySafe", "amountCurrencyMatched", "localLedgerReconciled"]) passed(report.sslcommerz.checkout[field], `sslcommerz.checkout.${field}`);
  exactKeys(report.sslcommerz.refund, "sslcommerz.refund", ["refundReferenceHash", "bankTransactionHash", "providerStatus", "partialRefund", "amountCurrencyMatched", "localLedgerReconciled"]);
  const refundReferenceHash = hash(report.sslcommerz.refund.refundReferenceHash, "sslcommerz.refund.refundReferenceHash");
  const bankTransactionHash = hash(report.sslcommerz.refund.bankTransactionHash, "sslcommerz.refund.bankTransactionHash");
  assert.equal(report.sslcommerz.refund.providerStatus, "refunded", "SSLCommerz refund must reach refunded status");
  assert.equal(typeof report.sslcommerz.refund.partialRefund, "boolean", "partialRefund must be boolean");
  passed(report.sslcommerz.refund.amountCurrencyMatched, "sslcommerz.refund.amountCurrencyMatched");
  passed(report.sslcommerz.refund.localLedgerReconciled, "sslcommerz.refund.localLedgerReconciled");

  exactKeys(report.payout, "payout", ["provider", "requestHash", "providerReferenceHash", "referenceFormatApproved", "walletReserved", "markedPaid", "localLedgerReconciled"]);
  const provider = bounded(report.payout.provider, "payout.provider", /^(BANK|BKASH|NAGAD|ROCKET)$/);
  const requestHash = hash(report.payout.requestHash, "payout.requestHash");
  const providerReferenceHash = hash(report.payout.providerReferenceHash, "payout.providerReferenceHash");
  for (const field of ["referenceFormatApproved", "walletReserved", "markedPaid", "localLedgerReconciled"]) passed(report.payout[field], `payout.${field}`);

  exactKeys(report.promotion, "promotion", ["couponApplied", "automaticPromotionApplied", "loyaltyApplied", "capBps", "capVerified"]);
  for (const field of ["couponApplied", "automaticPromotionApplied", "loyaltyApplied", "capVerified"]) passed(report.promotion[field], `promotion.${field}`);
  assert.equal(report.promotion.capBps, 3500, "Promotion evidence must verify the approved 35% cap");

  return { schemaVersion: 1, environment: "staging", commitSha, apiRelease, executedAt: executedAt.normalized, operator, financeApprover, sslcommerz: { mode: "live", checkout: { transactionHash: checkoutTransactionHash, captured: true, callbackValidated: true, callbackReplaySafe: true, amountCurrencyMatched: true, localLedgerReconciled: true }, refund: { refundReferenceHash, bankTransactionHash, providerStatus: "refunded", partialRefund: report.sslcommerz.refund.partialRefund, amountCurrencyMatched: true, localLedgerReconciled: true } }, payout: { provider, requestHash, providerReferenceHash, referenceFormatApproved: true, walletReserved: true, markedPaid: true, localLedgerReconciled: true }, promotion: { couponApplied: true, automaticPromotionApplied: true, loyaltyApplied: true, capBps: 3500, capVerified: true } };
}
