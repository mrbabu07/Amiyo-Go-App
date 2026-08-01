import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";

const migrationUrl = new URL("../prisma/migrations/20260801153000_phase_2_baseline/migration.sql", import.meta.url);

async function migratedDatabase() {
  const database = new PGlite();
  await database.exec(await readFile(migrationUrl, "utf8"));
  return database;
}

test("baseline migration executes on PostgreSQL", async () => {
  const database = await migratedDatabase();
  const result = await database.query("SELECT count(*)::int AS count FROM information_schema.tables WHERE table_schema = 'public'");
  assert.ok(result.rows[0].count >= 90);
  await database.close();
});

test("database rejects duplicate defaults and ownerless carts", async () => {
  const database = await migratedDatabase();
  const userId = "00000000-0000-4000-8000-000000009001";
  await database.query("INSERT INTO users (id, updated_at) VALUES ($1, now())", [userId]);
  await database.query(
    "INSERT INTO addresses (id, user_id, label, recipient_name, phone, line1, division, district, is_default, updated_at) VALUES ($1, $2, 'Home', 'Test User', '01000000000', 'Line 1', 'Dhaka', 'Dhaka', true, now())",
    ["00000000-0000-4000-8000-000000009101", userId]
  );
  await assert.rejects(() => database.query(
    "INSERT INTO addresses (id, user_id, label, recipient_name, phone, line1, division, district, is_default, updated_at) VALUES ($1, $2, 'Work', 'Test User', '01000000000', 'Line 2', 'Dhaka', 'Dhaka', true, now())",
    ["00000000-0000-4000-8000-000000009102", userId]
  ));
  await assert.rejects(() => database.query("INSERT INTO carts (id, updated_at) VALUES ($1, now())", ["00000000-0000-4000-8000-000000009201"]));
  await database.close();
});

test("idempotency and optimistic version guards allow one effect", async () => {
  const database = await migratedDatabase();
  await database.query("INSERT INTO idempotency_records (id, scope, key, request_hash) VALUES ($1, 'checkout', 'same-request', 'hash')", ["00000000-0000-4000-8000-000000009301"]);
  await assert.rejects(() => database.query("INSERT INTO idempotency_records (id, scope, key, request_hash) VALUES ($1, 'checkout', 'same-request', 'hash')", ["00000000-0000-4000-8000-000000009302"]));

  const userId = "00000000-0000-4000-8000-000000009401";
  await database.query("INSERT INTO users (id, updated_at) VALUES ($1, now())", [userId]);
  const first = await database.query("UPDATE users SET status = 'SUSPENDED', updated_at = now() WHERE id = $1 AND status = 'ACTIVE' RETURNING id", [userId]);
  const second = await database.query("UPDATE users SET status = 'DEACTIVATED', updated_at = now() WHERE id = $1 AND status = 'ACTIVE' RETURNING id", [userId]);
  assert.equal(first.rows.length, 1);
  assert.equal(second.rows.length, 0);
  await database.close();
});
