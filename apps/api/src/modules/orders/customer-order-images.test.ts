import assert from "node:assert/strict";
import test from "node:test";
import type { Session } from "@amiyo/contracts";
import { OrderService } from "./order.service.js";

const session = { principal: { userId: "buyer" } } as Session;

for (const image of ["https://images.example.test/product.jpg", null]) {
  test(`customer order carries product media or null: ${image !== null}`, async () => {
    const client = {
      platformConfiguration: { findUnique: async () => null },
      order: { findFirst: async (query: any) => { assert.deepEqual(query.where, { id: "order", userId: "buyer" }); assert.deepEqual(Object.keys(query.include), ["user"]); return { id: "order", orderNumber: "AG-1", status: "CONFIRMED", currency: "BDT", subtotalMinor: 100n, discountMinor: 0n, deliveryMinor: 0n, taxMinor: 0n, totalMinor: 100n, version: 1, createdAt: new Date(), user: null }; } },
      orderAddress: { findMany: async (query: any) => { assert.deepEqual(query.where, { orderId: "order" }); return []; } },
      payment: { findMany: async (query: any) => { assert.deepEqual(query.where, { orderId: "order" }); assert.equal(query.take, 1); return []; } },
      vendorOrder: { findMany: async (query: any) => { assert.deepEqual(query.where, { orderId: "order" }); assert.equal(query.select.items, undefined); return [{ id: "package", vendorId: "vendor", shopId: "shop", status: "DELIVERED", vendor: { displayName: "Seller" }, shop: { name: "Shop" }, subtotalMinor: 100n, discountMinor: 0n, deliveryMinor: 0n, totalMinor: 100n, commissionMinor: 6n, version: 1 }]; } },
      orderItem: { findMany: async (query: any) => { assert.deepEqual(query.where, { orderId: "order" }); assert.equal(query.include.product.select.media.take, 1); assert.deepEqual(query.include.returnItems.where, { returnRequest: { status: { notIn: ["REJECTED", "CLOSED"] } } }); return [{ id: "item", vendorOrderId: "package", productId: "product", variantId: "variant", productNameSnapshot: "Purchased name", skuSnapshot: "SKU", attributesSnapshot: null, currency: "BDT", unitPriceMinor: 100n, discountMinor: 0n, lineTotalMinor: 100n, quantity: 3, returnItems: image ? [{ quantity: 1 }, { quantity: 1 }] : [], product: { media: image ? [{ storageKey: image }] : [] } }]; } },
      shipment: { findMany: async () => [] }
    };
    const result = await new OrderService(client as never).customerOrder(session, "order");
    const item = result.vendorOrders[0]?.items[0];
    assert.ok(item);
    assert.equal(item.thumbnailUrl, image);
    assert.equal(item.productName, "Purchased name");
    assert.equal(item.lineTotal.amountMinor, "100");
    assert.equal(item.returnableQuantity, image ? 1 : 3);
    assert.deepEqual(result.vendorOrders[0]?.returnEligibility, { deadline: null, reason: "DELIVERY_UNVERIFIED", requireEvidence: true });
  });
}

test("customer image query does not bypass order ownership", async () => {
  const client = { order: { findFirst: async (query: any) => {
    assert.equal(query.where.userId, "buyer");
    return null;
  } } };
  await assert.rejects(new OrderService(client as never).customerOrder(session, "other-order"), /Order not found/);
});

test("customer packages expose the configured deadline, extension, evidence and remaining eligibility", async () => {
  const deliveredAt = new Date(Date.now() - 86400000);
  let returnWindowUntil: Date | null = null;
  let status = "DELIVERED";
  let returned = 0;
  let returnPolicy: unknown = { windowDays: 3, requireEvidence: false };
  const client = {
    platformConfiguration: { findUnique: async () => ({ returnPolicy }) },
    order: { findFirst: async () => ({ id: "order", createdAt: deliveredAt, returnWindowUntil, currency: "BDT", subtotalMinor: 100n, discountMinor: 0n, deliveryMinor: 0n, taxMinor: 0n, totalMinor: 100n, user: null }) },
    orderAddress: { findMany: async () => [] },
    payment: { findMany: async () => [] },
    vendorOrder: { findMany: async () => [{ id: "package", vendorId: "vendor", shopId: "shop", status, vendor: { displayName: "Seller" }, shop: { name: "Shop" }, subtotalMinor: 100n, discountMinor: 0n, deliveryMinor: 0n, totalMinor: 100n, commissionMinor: 0n, version: 1 }] },
    orderItem: { findMany: async () => [{ id: "item", vendorOrderId: "package", productId: "product", variantId: "variant", productNameSnapshot: "Item", skuSnapshot: "SKU", attributesSnapshot: null, quantity: 1, returnItems: [{ quantity: returned }], product: { media: [] }, currency: "BDT", unitPriceMinor: 100n, discountMinor: 0n, lineTotalMinor: 100n }] },
    shipment: { findMany: async () => [{ vendorOrderId: "package", deliveredAt, status: "DELIVERED", provider: "courier", trackingNumber: "TRACK" }] }
  };
  const read = async () => (await new OrderService(client as never).customerOrder(session, "order")).vendorOrders[0]?.returnEligibility;
  assert.deepEqual(await read(), { deadline: new Date(deliveredAt.getTime() + 3 * 86400000).toISOString(), reason: "AVAILABLE", requireEvidence: false });
  returnWindowUntil = new Date(0);
  assert.equal((await read())?.reason, "EXPIRED");
  returnWindowUntil = new Date(Date.now() + 86400000);
  assert.equal((await read())?.deadline, returnWindowUntil.toISOString());
  assert.equal((await read())?.reason, "AVAILABLE");
  returned = 1;
  assert.equal((await read())?.reason, "NO_ITEMS");
  status = "SHIPPED";
  assert.equal((await read())?.reason, "NOT_DELIVERED");
  status = "DELIVERED"; returned = 0; returnPolicy = null;
  assert.deepEqual(await read(), { deadline: null, reason: "POLICY_UNAVAILABLE", requireEvidence: null });
});

test("customer order loads independent relations concurrently after ownership", async () => {
  let started = 0;
  let release!: () => void;
  const barrier = new Promise<void>((resolve) => { release = resolve; });
  const relation = async (value: unknown) => { started += 1; if (started === 6) release(); await barrier; return value; };
  const client = {
    order: { findFirst: async () => ({ id: "order", orderNumber: "AG-1", status: "CONFIRMED", currency: "BDT", subtotalMinor: 0n, discountMinor: 0n, deliveryMinor: 0n, taxMinor: 0n, totalMinor: 0n, version: 1, createdAt: new Date(), user: null }) },
    orderAddress: { findMany: async () => relation([]) },
    payment: { findMany: async () => relation([]) },
    vendorOrder: { findMany: async () => relation([]) },
    orderItem: { findMany: async () => relation([]) },
    shipment: { findMany: async () => relation([]) },
    platformConfiguration: { findUnique: async () => relation(null) }
  };
  await new OrderService(client as never).customerOrder(session, "order");
  assert.equal(started, 6);
});
