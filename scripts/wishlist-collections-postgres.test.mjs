import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";

test("wishlist migration preserves other collections and products when a shared collection is deleted", async () => {
  const database = new PGlite();
  const owner = "91000000-0000-4000-8000-000000000001";
  const stranger = "91000000-0000-4000-8000-000000000002";
  const primary = "91000000-0000-4000-8000-000000000003";
  const custom = "91000000-0000-4000-8000-000000000004";
  const vendor = "91000000-0000-4000-8000-000000000005";
  const shop = "91000000-0000-4000-8000-000000000006";
  const category = "91000000-0000-4000-8000-000000000007";
  const product = "91000000-0000-4000-8000-000000000008";
  try {
    await database.exec(await readFile(new URL("../prisma/migrations/20260801153000_phase_2_baseline/migration.sql", import.meta.url), "utf8"));
    await database.query("INSERT INTO users (id, status, updated_at) VALUES ($1, 'ACTIVE', now()), ($2, 'ACTIVE', now())", [owner, stranger]);
    await database.query("INSERT INTO vendors (id, legal_name, display_name, updated_at) VALUES ($1, 'Demo', 'Demo', now())", [vendor]);
    await database.query("INSERT INTO vendor_shops (id, vendor_id, name, slug, updated_at) VALUES ($1, $2, 'Demo shop', 'demo-shop', now())", [shop, vendor]);
    await database.query("INSERT INTO categories (id, name, slug, updated_at) VALUES ($1, 'Demo', 'demo', now())", [category]);
    await database.query("INSERT INTO products (id, vendor_id, shop_id, category_id, name, slug, updated_at) VALUES ($1, $2, $3, $4, 'Demo product', 'demo-product', now())", [product, vendor, shop, category]);
    await database.query("INSERT INTO wishlists (id, user_id, name, is_default) VALUES ($1, $2, 'All saved items', true), ($3, $2, 'Gifts', false)", [primary, owner, custom]);
    await assert.rejects(database.query("INSERT INTO wishlists (id, user_id, is_default) VALUES (gen_random_uuid(), $1, true)", [owner]), /wishlists_one_default_per_user/);
    await database.query("INSERT INTO wishlist_items (wishlist_id, product_id) VALUES ($1, $3), ($2, $3)", [primary, custom, product]);
    await assert.rejects(database.query("INSERT INTO wishlist_items (wishlist_id, product_id) VALUES ($1, $2)", [custom, product]), /wishlist_items_pkey/);
    await database.query("INSERT INTO shared_wishlists (id, wishlist_id, share_token) VALUES (gen_random_uuid(), $1, 'private-test-token')", [custom]);
    const foreignDelete = await database.query("DELETE FROM wishlists WHERE id = $1 AND user_id = $2 AND is_default = false RETURNING id", [custom, stranger]);
    const defaultDelete = await database.query("DELETE FROM wishlists WHERE id = $1 AND user_id = $2 AND is_default = false RETURNING id", [primary, owner]);
    assert.equal(foreignDelete.rows.length, 0);
    assert.equal(defaultDelete.rows.length, 0);
    await database.query("UPDATE wishlists SET name = 'Birthday gifts' WHERE id = $1 AND user_id = $2 AND is_default = false", [custom, owner]);
    assert.equal((await database.query("SELECT name FROM wishlists WHERE id = $1", [custom])).rows[0].name, "Birthday gifts");
    await database.query("DELETE FROM wishlists WHERE id = $1 AND user_id = $2 AND is_default = false", [custom, owner]);
    assert.equal((await database.query("SELECT * FROM shared_wishlists WHERE wishlist_id = $1", [custom])).rows.length, 0);
    assert.deepEqual((await database.query("SELECT wishlist_id, product_id FROM wishlist_items")).rows, [{ wishlist_id: primary, product_id: product }]);
    assert.equal((await database.query("SELECT id FROM products WHERE id = $1", [product])).rows.length, 1);
    assert.equal((await database.query("SELECT id FROM wishlists WHERE id = $1", [primary])).rows.length, 1);
  } finally {
    await database.close();
  }
});
