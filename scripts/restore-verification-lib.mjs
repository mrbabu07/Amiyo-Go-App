import assert from "node:assert/strict";

export function restoreVerificationConfiguration(environment) {
  assert.equal(environment.RESTORE_VERIFICATION_ACK, "isolated-non-production", "RESTORE_VERIFICATION_ACK must confirm an isolated non-production target");
  const value = environment.RESTORE_DATABASE_URL?.trim();
  assert.ok(value, "RESTORE_DATABASE_URL is required");
  const database = new URL(value);
  assert.ok(["postgres:", "postgresql:"].includes(database.protocol), "RESTORE_DATABASE_URL must be PostgreSQL");
  assert.ok(["require", "verify-ca", "verify-full"].includes(database.searchParams.get("sslmode") ?? ""), "RESTORE_DATABASE_URL must require TLS");
  if (environment.DATABASE_URL) assert.notEqual(database.href, new URL(environment.DATABASE_URL.trim()).href, "Restore verification cannot target DATABASE_URL");
  const reportPath = environment.RESTORE_REPORT_PATH?.trim();
  assert.ok(reportPath, "RESTORE_REPORT_PATH is required");
  return { databaseUrl: value, reportPath };
}

export async function verifyRestoredDatabase(client) {
  const [summary] = await client.$queryRawUnsafe(restoreVerificationQuery);
  const violations = Object.fromEntries(["invalid_inventory", "invalid_payments", "invalid_orders", "invalid_ledger_entries", "duplicate_payment_ids", "duplicate_outbox_keys"].map((key) => [key, summary[key]]));
  return {
    kind: "isolated-postgres-restore-verification",
    measuredAt: new Date().toISOString(),
    passed: Object.values(violations).every((value) => value === "0"),
    counts: { users: summary.users, vendors: summary.vendors, products: summary.products, orders: summary.orders, payments: summary.payments, refunds: summary.refunds, ledgerEntries: summary.ledger_entries, outboxEvents: summary.outbox_events },
    totals: { orderMinor: summary.order_total_minor, paymentMinor: summary.payment_total_minor, paymentRefundedMinor: summary.payment_refunded_minor, completedRefundMinor: summary.completed_refund_minor, vendorLedgerBalanceMinor: summary.vendor_ledger_balance_minor },
    violations,
    outbox: { pending: summary.pending_outbox, failed: summary.failed_outbox }
  };
}

export const restoreVerificationQuery = `
    SELECT
      (SELECT COUNT(*) FROM users)::text AS users,
      (SELECT COUNT(*) FROM vendors)::text AS vendors,
      (SELECT COUNT(*) FROM products)::text AS products,
      (SELECT COUNT(*) FROM orders)::text AS orders,
      (SELECT COUNT(*) FROM payments)::text AS payments,
      (SELECT COUNT(*) FROM refunds)::text AS refunds,
      (SELECT COUNT(*) FROM vendor_ledger_entries)::text AS ledger_entries,
      (SELECT COUNT(*) FROM outbox_events)::text AS outbox_events,
      COALESCE((SELECT SUM(total_minor) FROM orders), 0)::text AS order_total_minor,
      COALESCE((SELECT SUM(amount_minor) FROM payments), 0)::text AS payment_total_minor,
      COALESCE((SELECT SUM(refunded_minor) FROM payments), 0)::text AS payment_refunded_minor,
      COALESCE((SELECT SUM(amount_minor) FROM refunds WHERE status = 'completed'), 0)::text AS completed_refund_minor,
      COALESCE((SELECT SUM(CASE WHEN direction = 'CREDIT' THEN amount_minor ELSE -amount_minor END) FROM vendor_ledger_entries), 0)::text AS vendor_ledger_balance_minor,
      (SELECT COUNT(*) FROM inventory_items WHERE on_hand < 0 OR reserved < 0 OR reserved > on_hand)::text AS invalid_inventory,
      (SELECT COUNT(*) FROM payments WHERE amount_minor < 0 OR refunded_minor < 0 OR refunded_minor > amount_minor)::text AS invalid_payments,
      (SELECT COUNT(*) FROM orders WHERE subtotal_minor < 0 OR discount_minor < 0 OR delivery_minor < 0 OR tax_minor < 0 OR total_minor < 0)::text AS invalid_orders,
      (SELECT COUNT(*) FROM vendor_ledger_entries WHERE amount_minor <= 0)::text AS invalid_ledger_entries,
      (SELECT COUNT(*) FROM (SELECT provider_transaction_id FROM payments WHERE provider_transaction_id IS NOT NULL GROUP BY provider_transaction_id HAVING COUNT(*) > 1) duplicates)::text AS duplicate_payment_ids,
      (SELECT COUNT(*) FROM (SELECT idempotency_key FROM outbox_events GROUP BY idempotency_key HAVING COUNT(*) > 1) duplicates)::text AS duplicate_outbox_keys,
      (SELECT COUNT(*) FROM outbox_events WHERE status = 'pending')::text AS pending_outbox,
      (SELECT COUNT(*) FROM outbox_events WHERE status = 'failed')::text AS failed_outbox
  `;
