import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";

const migrationUrl = new URL("../prisma/migrations/20260801153000_phase_2_baseline/migration.sql", import.meta.url);

async function database() {
  const client = new PGlite();
  await client.exec(await readFile(migrationUrl, "utf8"));
  return client;
}

test("checkout idempotency keys cannot create duplicate records", async () => {
  const client = await database();
  const insert = "INSERT INTO idempotency_records (id, scope, key, request_hash, response) VALUES ($1, 'checkout:user-1', 'same-key', 'hash', '{\"orderId\":\"order-1\"}')";
  await client.query(insert, ["50000000-0000-4000-8000-000000000001"]);
  await assert.rejects(() => client.query(insert, ["50000000-0000-4000-8000-000000000002"]));
  const replay = await client.query("SELECT response FROM idempotency_records WHERE scope = 'checkout:user-1' AND key = 'same-key'");
  assert.equal(replay.rows[0].response.orderId, "order-1");
  await client.close();
});

test("atomic reservations cannot oversell inventory", async () => {
  const client = await database();
  const vendorId = "51000000-0000-4000-8000-000000000001";
  const shopId = "51000000-0000-4000-8000-000000000002";
  const categoryId = "51000000-0000-4000-8000-000000000003";
  const productId = "51000000-0000-4000-8000-000000000004";
  const variantId = "51000000-0000-4000-8000-000000000005";
  await client.query("INSERT INTO vendors (id, legal_name, display_name, status, updated_at) VALUES ($1, 'Vendor', 'Vendor', 'APPROVED', now())", [vendorId]);
  await client.query("INSERT INTO vendor_shops (id, vendor_id, name, slug, status, updated_at) VALUES ($1, $2, 'Shop', 'shop', 'ACTIVE', now())", [shopId, vendorId]);
  await client.query("INSERT INTO categories (id, name, slug, updated_at) VALUES ($1, 'Category', 'category', now())", [categoryId]);
  await client.query("INSERT INTO products (id, vendor_id, shop_id, category_id, name, slug, status, updated_at) VALUES ($1, $2, $3, $4, 'Product', 'product', 'APPROVED', now())", [productId, vendorId, shopId, categoryId]);
  await client.query("INSERT INTO product_variants (id, product_id, sku, title, price_minor, updated_at) VALUES ($1, $2, 'SKU-1', 'Default', 1000, now())", [variantId, productId]);
  await client.query("INSERT INTO inventory_items (id, variant_id, on_hand, reserved, updated_at) VALUES ($1, $2, 5, 0, now())", ["51000000-0000-4000-8000-000000000006", variantId]);
  const reserve = () => client.query("UPDATE inventory_items SET reserved = reserved + 3, version = version + 1, updated_at = now() WHERE variant_id = $1 AND on_hand - reserved >= 3 RETURNING reserved", [variantId]);
  const attempts = await Promise.all([reserve(), reserve()]);
  assert.deepEqual(attempts.map((result) => result.rows.length).sort(), [0, 1]);
  const inventory = await client.query("SELECT reserved FROM inventory_items WHERE variant_id = $1", [variantId]);
  assert.equal(inventory.rows[0].reserved, 3);
  await client.close();
});

test("provider event IDs make payment webhooks replay safe", async () => {
  const client = await database();
  const insert = "INSERT INTO payment_webhooks (id, provider, provider_event_id, signature_valid, payload) VALUES ($1, 'bkash', 'event-1', true, '{}')";
  await client.query(insert, ["52000000-0000-4000-8000-000000000001"]);
  await assert.rejects(() => client.query(insert, ["52000000-0000-4000-8000-000000000002"]));
  await client.close();
});
