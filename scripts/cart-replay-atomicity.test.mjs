import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";

test("cart quantity and replay receipt roll back together when receipt insertion fails", async () => {
  const client = new PGlite();
  const ids = Array.from({ length: 10 }, (_, index) => `61000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`);
  const [userId, vendorId, shopId, categoryId, productId, variantId, cartId, itemId, receiptId, duplicateId] = ids;
  try {
    await client.exec(await readFile(new URL("../prisma/migrations/20260801153000_phase_2_baseline/migration.sql", import.meta.url), "utf8"));
    await client.query("INSERT INTO users (id, updated_at) VALUES ($1, now())", [userId]);
    await client.query("INSERT INTO vendors (id, legal_name, display_name, status, updated_at) VALUES ($1, 'Vendor', 'Vendor', 'APPROVED', now())", [vendorId]);
    await client.query("INSERT INTO vendor_shops (id, vendor_id, name, slug, status, updated_at) VALUES ($1, $2, 'Shop', 'shop', 'ACTIVE', now())", [shopId, vendorId]);
    await client.query("INSERT INTO categories (id, name, slug, updated_at) VALUES ($1, 'Category', 'category', now())", [categoryId]);
    await client.query("INSERT INTO products (id, vendor_id, shop_id, category_id, name, slug, status, updated_at) VALUES ($1, $2, $3, $4, 'Product', 'product', 'APPROVED', now())", [productId, vendorId, shopId, categoryId]);
    await client.query("INSERT INTO product_variants (id, product_id, sku, title, price_minor, updated_at) VALUES ($1, $2, 'SKU', 'Default', 1000, now())", [variantId, productId]);
    await client.query("INSERT INTO carts (id, user_id, updated_at) VALUES ($1, $2, now())", [cartId, userId]);
    await client.query("INSERT INTO cart_items (id, cart_id, product_id, variant_id, quantity, display_price_minor, updated_at) VALUES ($1, $2, $3, $4, 1, 1000, now())", [itemId, cartId, productId, variantId]);
    const add = async (receipt, scope = `cart-add:${userId}`) => client.transaction(async (transaction) => {
      await transaction.query("UPDATE cart_items SET quantity = quantity + 2 WHERE id = $1", [itemId]);
      await transaction.query("INSERT INTO idempotency_records (id, scope, key, request_hash, response, expires_at) VALUES ($1, $2, 'same-key', 'hash', '{}', now() + interval '24 hours')", [receipt, scope]);
    });
    await add(receiptId);
    await assert.rejects(add(duplicateId), (error) => error.code === "23505");
    assert.equal((await client.query("SELECT quantity FROM cart_items WHERE id = $1", [itemId])).rows[0].quantity, 3);
    assert.equal((await client.query("SELECT count(*)::int AS count FROM idempotency_records")).rows[0].count, 1);
    await client.query("INSERT INTO idempotency_records (id, scope, key, request_hash, response) VALUES ($1, 'cart-add:other-user', 'same-key', 'hash', '{}')", [duplicateId]);
    assert.equal((await client.query("SELECT count(*)::int AS count FROM idempotency_records")).rows[0].count, 2);
  } finally { await client.close(); }
});
