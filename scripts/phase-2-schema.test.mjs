import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const schemaUrl = new URL("../prisma/schema.prisma", import.meta.url);
const migrationUrl = new URL("../prisma/migrations/20260801153000_phase_2_baseline/migration.sql", import.meta.url);

test("Phase 2 migration covers all required domain groups", async () => {
  const migration = await readFile(migrationUrl, "utf8");
  const requiredTables = [
    "users", "vendor_members", "products", "inventory_reservations", "carts", "orders", "vendor_orders", "delivery_dispatches", "payments", "refunds", "vendor_ledger_entries", "coupons", "campaigns", "reviews", "returns", "support_tickets", "audit_logs", "notifications", "outbox_events"
  ];
  for (const table of requiredTables) assert.match(migration, new RegExp(`CREATE TABLE "${table}"`));
});

test("database constraints protect transactional invariants", async () => {
  const migration = await readFile(migrationUrl, "utf8");
  const constraints = [
    "inventory_items_reserved_within_stock", "inventory_reservations_owner_check", "carts_owner_check", "orders_amounts_non_negative", "payments_amounts_check", "delivery_dispatches_key_format", "reviews_rating_check", "addresses_one_default_per_user", "carts_one_active_per_user"
  ];
  for (const constraint of constraints) assert.match(migration, new RegExp(constraint));
});

test("Prisma schema uses UUIDs, timestamptz, and bigint money", async () => {
  const schema = await readFile(schemaUrl, "utf8");
  assert.match(schema, /@default\(uuid\(\)\) @db\.Uuid/);
  assert.match(schema, /@db\.Timestamptz\(3\)/);
  assert.match(schema, /amountMinor\s+BigInt/);
});
