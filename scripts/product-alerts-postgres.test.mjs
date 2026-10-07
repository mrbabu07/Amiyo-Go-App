import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { upsertProductAlert } from "../apps/api/dist/modules/engagement/product-alert.persistence.js";

test("alert migration preserves existing subscriptions and atomic upserts keep stock and price independent", async () => {
  const database = new PGlite();
  const owner = "92000000-0000-4000-8000-000000000001";
  const stranger = "92000000-0000-4000-8000-000000000002";
  const vendor = "92000000-0000-4000-8000-000000000005";
  const shop = "92000000-0000-4000-8000-000000000006";
  const category = "92000000-0000-4000-8000-000000000007";
  const product = "92000000-0000-4000-8000-000000000008";
  const existing = "92000000-0000-4000-8000-000000000009";
  const client = { $executeRaw: async (parts, ...values) => {
    const sql = parts.reduce((query, part, index) => query + (index ? "$" + index : "") + part, "");
    return database.query(sql, values.map((value) => typeof value === "bigint" ? value.toString() : value));
  } };
  try {
    await database.exec(await readFile(new URL("../prisma/migrations/20260801153000_phase_2_baseline/migration.sql", import.meta.url), "utf8"));
    await database.query("INSERT INTO users (id, status, updated_at) VALUES ($1, 'ACTIVE', now()), ($2, 'ACTIVE', now())", [owner, stranger]);
    await database.query("INSERT INTO vendors (id, legal_name, display_name, updated_at) VALUES ($1, 'Demo', 'Demo', now())", [vendor]);
    await database.query("INSERT INTO vendor_shops (id, vendor_id, name, slug, updated_at) VALUES ($1, $2, 'Demo shop', 'demo-shop', now())", [shop, vendor]);
    await database.query("INSERT INTO categories (id, name, slug, updated_at) VALUES ($1, 'Demo', 'demo', now())", [category]);
    await database.query("INSERT INTO products (id, vendor_id, shop_id, category_id, name, slug, updated_at) VALUES ($1, $2, $3, $4, 'Demo product', 'demo-product', now())", [product, vendor, shop, category]);
    await database.query("INSERT INTO stock_alerts (id, user_id, product_id, target_minor, active) VALUES ($1, $2, $3, 50000, false)", [existing, owner, product]);
    const before = (await database.query("SELECT * FROM stock_alerts")).rows;
    await database.exec(await readFile(new URL("../prisma/migrations/20261007010000_independent_product_alerts/migration.sql", import.meta.url), "utf8"));
    assert.deepEqual((await database.query("SELECT * FROM stock_alerts")).rows, before);
    await upsertProductAlert(client, owner, product, null);
    await upsertProductAlert(client, owner, product, 40000n);
    await upsertProductAlert(client, owner, product, 35000n);
    await upsertProductAlert(client, owner, product, null);
    const rows = (await database.query("SELECT id, target_minor::text AS target, active FROM stock_alerts WHERE user_id = $1 ORDER BY target_minor NULLS FIRST", [owner])).rows;
    assert.equal(rows.length, 2);
    assert.equal(rows[0].target, null);
    assert.equal(rows[1].target, "35000");
    assert.equal(rows[1].id, existing);
    assert.ok(rows.every((row) => row.active));
    await database.query("UPDATE stock_alerts SET active = false WHERE user_id = $1 AND product_id = $2 AND target_minor IS NULL", [owner, product]);
    assert.equal((await database.query("SELECT active FROM stock_alerts WHERE id = $1", [existing])).rows[0].active, true);
    await upsertProductAlert(client, stranger, product, null);
    assert.equal((await database.query("SELECT count(*)::int AS count FROM stock_alerts")).rows[0].count, 3);
    for (const target of [null, "100"]) {
      await assert.rejects(database.query("INSERT INTO stock_alerts (id, user_id, product_id, target_minor) VALUES (gen_random_uuid(), $1, $2, $3)", [owner, product, target]), /unique/);
    }
  } finally { await database.close(); }
});
