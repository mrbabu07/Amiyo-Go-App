import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";

const baseline = new URL("../prisma/migrations/20260801153000_phase_2_baseline/migration.sql", import.meta.url);
const phase6 = new URL("../prisma/migrations/20260802003000_phase_6_delivery/migration.sql", import.meta.url);

async function database() { const client = new PGlite(); await client.exec(await readFile(baseline, "utf8")); await client.exec(await readFile(phase6, "utf8")); return client; }

async function fulfillmentFixture(client) {
  const vendorId = "60000000-0000-4000-8000-000000000001", shopId = "60000000-0000-4000-8000-000000000002", orderId = "60000000-0000-4000-8000-000000000003", vendorOrderId = "60000000-0000-4000-8000-000000000004";
  await client.query("INSERT INTO vendors (id, legal_name, display_name, status, updated_at) VALUES ($1, 'Vendor', 'Vendor', 'APPROVED', now())", [vendorId]);
  await client.query("INSERT INTO vendor_shops (id, vendor_id, name, slug, status, updated_at) VALUES ($1, $2, 'Shop', 'shop', 'ACTIVE', now())", [shopId, vendorId]);
  await client.query("INSERT INTO orders (id, order_number, status, subtotal_minor, total_minor, updated_at) VALUES ($1, 'AGO-PHASE6', 'PROCESSING', 1000, 1000, now())", [orderId]);
  await client.query("INSERT INTO vendor_orders (id, order_id, vendor_id, shop_id, status, subtotal_minor, total_minor, updated_at) VALUES ($1, $2, $3, $4, 'READY_TO_SHIP', 1000, 1000, now())", [vendorOrderId, orderId, vendorId, shopId]);
  return { vendorOrderId };
}

test("duplicate READY_TO_SHIP effects collapse to one dispatch, shipment, and outbox event", async () => {
  const client = await database(); const { vendorOrderId } = await fulfillmentFixture(client); const key = `delivery-create:${vendorOrderId}`;
  await client.query("INSERT INTO delivery_dispatches (id, vendor_order_id, provider, dispatch_key, request_snapshot, updated_at) VALUES ($1, $2, 'amiyo_delivery', $3, '{}', now())", ["61000000-0000-4000-8000-000000000001", vendorOrderId, key]);
  await assert.rejects(() => client.query("INSERT INTO delivery_dispatches (id, vendor_order_id, provider, dispatch_key, request_snapshot, updated_at) VALUES ($1, $2, 'amiyo_delivery', $3, '{}', now())", ["61000000-0000-4000-8000-000000000002", vendorOrderId, key]));
  await client.query("INSERT INTO shipments (id, vendor_order_id, status, updated_at) VALUES ($1, $2, 'READY_TO_SHIP', now())", ["61000000-0000-4000-8000-000000000003", vendorOrderId]);
  await assert.rejects(() => client.query("INSERT INTO shipments (id, vendor_order_id, status, updated_at) VALUES ($1, $2, 'READY_TO_SHIP', now())", ["61000000-0000-4000-8000-000000000004", vendorOrderId]));
  await client.query("INSERT INTO outbox_events (id, aggregate_type, aggregate_id, event_type, idempotency_key, payload) VALUES ($1, 'delivery_dispatch', $2, 'delivery.dispatch.requested', $3, '{}')", ["61000000-0000-4000-8000-000000000005", vendorOrderId, key]);
  await assert.rejects(() => client.query("INSERT INTO outbox_events (id, aggregate_type, aggregate_id, event_type, idempotency_key, payload) VALUES ($1, 'delivery_dispatch', $2, 'delivery.dispatch.requested', $3, '{}')", ["61000000-0000-4000-8000-000000000006", vendorOrderId, key]));
  await client.close();
});

test("worker restart keeps the durable event and callbacks remain replay safe", async () => {
  const client = await database(); const { vendorOrderId } = await fulfillmentFixture(client); const dispatchId = "62000000-0000-4000-8000-000000000001", key = `delivery-create:${vendorOrderId}`;
  await client.query("INSERT INTO delivery_dispatches (id, vendor_order_id, provider, dispatch_key, external_order_id, request_snapshot, updated_at) VALUES ($1, $2, 'amiyo_delivery', $3, 'external-1', '{}', now())", [dispatchId, vendorOrderId, key]);
  await client.query("INSERT INTO outbox_events (id, aggregate_type, aggregate_id, event_type, idempotency_key, payload, status) VALUES ($1, 'delivery_dispatch', $2, 'delivery.dispatch.requested', $3, '{}', 'processing')", ["62000000-0000-4000-8000-000000000002", dispatchId, key]);
  await client.query("UPDATE outbox_events SET status = 'pending' WHERE idempotency_key = $1", [key]);
  const recovered = await client.query("SELECT id FROM outbox_events WHERE idempotency_key = $1 AND status = 'pending'", [key]); assert.equal(recovered.rows.length, 1);
  const callback = "INSERT INTO delivery_callbacks (id, dispatch_id, provider, provider_event_id, signature_valid, payload) VALUES ($1, $2, 'amiyo_delivery', 'event-1', true, '{}')";
  await client.query(callback, ["62000000-0000-4000-8000-000000000003", dispatchId]);
  await assert.rejects(() => client.query(callback, ["62000000-0000-4000-8000-000000000004", dispatchId]));
  await client.close();
});
