import assert from "node:assert/strict";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { restoreVerificationConfiguration, restoreVerificationQuery, verifyRestoredDatabase } from "./restore-verification-lib.mjs";

test("restore verification requires an isolated TLS target and evidence path", () => {
  const url = "postgresql://restore.example/amiyo?sslmode=require";
  assert.throws(() => restoreVerificationConfiguration({ RESTORE_DATABASE_URL: url, RESTORE_REPORT_PATH: "report.json" }), /must confirm/);
  assert.throws(() => restoreVerificationConfiguration({ RESTORE_VERIFICATION_ACK: "isolated-non-production", RESTORE_DATABASE_URL: "postgresql://restore.example/amiyo", RESTORE_REPORT_PATH: "report.json" }), /require TLS/);
  assert.throws(() => restoreVerificationConfiguration({ RESTORE_VERIFICATION_ACK: "isolated-non-production", RESTORE_DATABASE_URL: url, DATABASE_URL: url, RESTORE_REPORT_PATH: "report.json" }), /cannot target DATABASE_URL/);
  assert.equal(restoreVerificationConfiguration({ RESTORE_VERIFICATION_ACK: "isolated-non-production", RESTORE_DATABASE_URL: url, RESTORE_REPORT_PATH: "report.json" }).reportPath, "report.json");
});

test("restore verification reports exact string totals and fails integrity violations", async () => {
  const clean = row();
  const cleanReport = await verifyRestoredDatabase({ $queryRawUnsafe: async () => [clean] });
  assert.equal(cleanReport.passed, true);
  assert.equal(cleanReport.totals.orderMinor, "900719925474099300");
  const brokenReport = await verifyRestoredDatabase({ $queryRawUnsafe: async () => [{ ...clean, invalid_inventory: "1" }] });
  assert.equal(brokenReport.passed, false);
});

test("restore reconciliation query executes against PostgreSQL", async () => {
  const database = new PGlite();
  await database.exec(`
    CREATE TABLE users (id uuid); CREATE TABLE vendors (id uuid); CREATE TABLE products (id uuid);
    CREATE TABLE orders (id uuid, subtotal_minor bigint, discount_minor bigint, delivery_minor bigint, tax_minor bigint, total_minor bigint);
    CREATE TABLE payments (id uuid, amount_minor bigint, refunded_minor bigint, provider_transaction_id text);
    CREATE TABLE refunds (id uuid, amount_minor bigint, status text);
    CREATE TABLE vendor_ledger_entries (id uuid, direction text, amount_minor bigint);
    CREATE TABLE inventory_items (id uuid, on_hand integer, reserved integer);
    CREATE TABLE outbox_events (id uuid, idempotency_key text, status text);
  `);
  const result = await database.query(restoreVerificationQuery);
  assert.equal(result.rows[0].invalid_inventory, "0");
  assert.equal(result.rows[0].order_total_minor, "0");
  await database.close();
});

function row() {
  return { users: "10", vendors: "2", products: "20", orders: "5", payments: "5", refunds: "1", ledger_entries: "4", outbox_events: "3", order_total_minor: "900719925474099300", payment_total_minor: "50000", payment_refunded_minor: "1000", completed_refund_minor: "1000", vendor_ledger_balance_minor: "25000", invalid_inventory: "0", invalid_payments: "0", invalid_orders: "0", invalid_ledger_entries: "0", duplicate_payment_ids: "0", duplicate_outbox_keys: "0", pending_outbox: "1", failed_outbox: "0" };
}
