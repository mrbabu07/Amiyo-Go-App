import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";

const migrationUrl = new URL("../prisma/migrations/20260801153000_phase_2_baseline/migration.sql", import.meta.url);

async function catalogDatabase() {
  const database = new PGlite();
  await database.exec(await readFile(migrationUrl, "utf8"));
  const vendorId = "10000000-0000-4000-8000-000000000001";
  const shopId = "10000000-0000-4000-8000-000000000002";
  const categoryId = "10000000-0000-4000-8000-000000000003";
  await database.query("INSERT INTO vendors (id, legal_name, display_name, status, updated_at) VALUES ($1, 'Vendor Ltd', 'Vendor', 'APPROVED', now())", [vendorId]);
  await database.query("INSERT INTO vendor_shops (id, vendor_id, name, slug, status, updated_at) VALUES ($1, $2, 'Shop', 'shop', 'ACTIVE', now())", [shopId, vendorId]);
  await database.query("INSERT INTO categories (id, name, slug, updated_at) VALUES ($1, 'Category', 'category', now())", [categoryId]);
  return { database, vendorId, shopId, categoryId };
}

test("catalog keyset pages are bounded and do not overlap", async () => {
  const { database, vendorId, shopId, categoryId } = await catalogDatabase();
  for (let index = 1; index <= 25; index += 1) {
    const id = `10000000-0000-4000-8000-${String(index).padStart(12, "0")}`;
    await database.query("INSERT INTO products (id, vendor_id, shop_id, category_id, name, slug, status, published_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, 'APPROVED', now() - ($7 || ' seconds')::interval, now())", [id, vendorId, shopId, categoryId, `Product ${index}`, `product-${index}`, index]);
  }
  const first = await database.query("SELECT id, published_at FROM products WHERE status = 'APPROVED' ORDER BY published_at DESC, id DESC LIMIT 11");
  assert.equal(first.rows.length, 11);
  const visible = first.rows.slice(0, 10);
  const cursor = visible.at(-1);
  const second = await database.query("SELECT id FROM products WHERE status = 'APPROVED' AND (published_at, id) < ($1, $2) ORDER BY published_at DESC, id DESC LIMIT 11", [cursor.published_at, cursor.id]);
  assert.equal(second.rows.length, 11);
  assert.equal(second.rows.some((row) => visible.some((item) => item.id === row.id)), false);
  await database.close();
});

test("inventory rejects negative stock and duplicate SKUs", async () => {
  const { database, vendorId, shopId, categoryId } = await catalogDatabase();
  const productId = "20000000-0000-4000-8000-000000000001";
  const variantId = "20000000-0000-4000-8000-000000000002";
  await database.query("INSERT INTO products (id, vendor_id, shop_id, category_id, name, slug, updated_at) VALUES ($1, $2, $3, $4, 'Draft', 'draft', now())", [productId, vendorId, shopId, categoryId]);
  await database.query("INSERT INTO product_variants (id, product_id, sku, title, price_minor, updated_at) VALUES ($1, $2, 'SKU-UNIQUE', 'Default', 1000, now())", [variantId, productId]);
  await assert.rejects(() => database.query("INSERT INTO inventory_items (id, variant_id, on_hand, updated_at) VALUES ($1, $2, -1, now())", ["20000000-0000-4000-8000-000000000003", variantId]));
  await assert.rejects(() => database.query("INSERT INTO product_variants (id, product_id, sku, title, price_minor, updated_at) VALUES ($1, $2, 'SKU-UNIQUE', 'Duplicate', 1000, now())", ["20000000-0000-4000-8000-000000000004", productId]));
  await database.close();
});
