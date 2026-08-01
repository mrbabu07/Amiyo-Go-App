import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";

const baseline = new URL("../prisma/migrations/20260801153000_phase_2_baseline/migration.sql", import.meta.url);
const phase7 = new URL("../prisma/migrations/20260802021000_phase_7_finance_operations/migration.sql", import.meta.url);
async function database() { const client = new PGlite(); await client.exec(await readFile(baseline, "utf8")); await client.exec(await readFile(phase7, "utf8")); return client; }

async function vendorFixture(client) {
  const vendorId = "70000000-0000-4000-8000-000000000001", walletId = "70000000-0000-4000-8000-000000000002", bankId = "70000000-0000-4000-8000-000000000003";
  await client.query("INSERT INTO vendors (id, legal_name, display_name, status, updated_at) VALUES ($1, 'Vendor', 'Vendor', 'APPROVED', now())", [vendorId]);
  await client.query("INSERT INTO vendor_wallets (id, vendor_id) VALUES ($1, $2)", [walletId, vendorId]);
  await client.query("INSERT INTO vendor_bank_accounts (id, vendor_id, provider, account_name, account_number_masked, encrypted_payload, verified_at) VALUES ($1, $2, 'bank', 'Vendor', '***1234', $3, now())", [bankId, vendorId, new Uint8Array([1])]);
  return { vendorId, walletId, bankId };
}

test("wallet balance is derived and duplicate financial effects are rejected", async () => {
  const client = await database(); const { walletId } = await vendorFixture(client);
  await client.query("INSERT INTO vendor_ledger_entries (id, wallet_id, direction, amount_minor, entry_type, reference_type, reference_id, idempotency_key) VALUES (gen_random_uuid(), $1, 'CREDIT', 5000, 'ORDER_SETTLEMENT', 'vendor_order', 'one', 'settlement:one'), (gen_random_uuid(), $1, 'DEBIT', 1250, 'PAYOUT_RESERVE', 'payout_request', 'two', 'reserve:two')", [walletId]);
  const balance = await client.query("SELECT COALESCE(SUM(CASE WHEN direction = 'CREDIT' THEN amount_minor ELSE -amount_minor END), 0) AS balance FROM vendor_ledger_entries WHERE wallet_id = $1", [walletId]); assert.equal(Number(balance.rows[0].balance), 3750);
  await assert.rejects(() => client.query("INSERT INTO vendor_ledger_entries (id, wallet_id, direction, amount_minor, entry_type, reference_type, reference_id, idempotency_key) VALUES (gen_random_uuid(), $1, 'CREDIT', 5000, 'ORDER_SETTLEMENT', 'vendor_order', 'one', 'settlement:one')", [walletId])); await client.close();
});

test("payout request requires its vendor bank account and tracks review version", async () => {
  const client = await database(); const { vendorId, bankId } = await vendorFixture(client); const requestId = "71000000-0000-4000-8000-000000000001";
  await client.query("INSERT INTO vendor_payout_requests (id, vendor_id, bank_account_id, amount_minor) VALUES ($1, $2, $3, 1000)", [requestId, vendorId, bankId]);
  const updated = await client.query("UPDATE vendor_payout_requests SET status = 'APPROVED', reviewed_at = now(), version = version + 1 WHERE id = $1 AND version = 1 RETURNING version", [requestId]); assert.equal(updated.rows[0].version, 2);
  await assert.rejects(() => client.query("INSERT INTO vendor_payout_requests (id, vendor_id, bank_account_id, amount_minor) VALUES (gen_random_uuid(), $1, gen_random_uuid(), 1000)", [vendorId])); await client.close();
});

test("COD reconciliation preserves expected, received, and variance totals", async () => {
  const client = await database(); const userId = "72000000-0000-4000-8000-000000000001", orderId = "72000000-0000-4000-8000-000000000002", paymentId = "72000000-0000-4000-8000-000000000003", collectionId = "72000000-0000-4000-8000-000000000004", reconciliationId = "72000000-0000-4000-8000-000000000005";
  await client.query("INSERT INTO users (id, status, updated_at) VALUES ($1, 'ACTIVE', now())", [userId]); await client.query("INSERT INTO orders (id, order_number, user_id, status, subtotal_minor, total_minor, updated_at) VALUES ($1, 'AGO-PHASE7', $2, 'DELIVERED', 1000, 1000, now())", [orderId, userId]); await client.query("INSERT INTO payments (id, order_id, provider, method, status, amount_minor, updated_at) VALUES ($1, $2, 'cod', 'COD', 'CAPTURED', 1000, now())", [paymentId, orderId]); await client.query("INSERT INTO cod_collections (id, payment_id, collected_minor, collected_at) VALUES ($1, $2, 950, now())", [collectionId, paymentId]); await client.query("INSERT INTO cod_reconciliations (id, period_start, period_end, expected_minor, received_minor, status) VALUES ($1, now() - interval '1 day', now() + interval '1 day', 1000, 950, 'variance')", [reconciliationId]); await client.query("INSERT INTO cod_reconciliation_items (reconciliation_id, collection_id, variance_minor) VALUES ($1, $2, -50)", [reconciliationId, collectionId]);
  const totals = await client.query("SELECT expected_minor, received_minor, received_minor - expected_minor AS variance FROM cod_reconciliations WHERE id = $1", [reconciliationId]); assert.deepEqual(totals.rows.map((row) => [Number(row.expected_minor), Number(row.received_minor), Number(row.variance)]), [[1000, 950, -50]]); await client.close();
});
