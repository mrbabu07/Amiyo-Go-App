import assert from "node:assert/strict";
import test from "node:test";
import type { Session } from "@amiyo/contracts";
import { OrderService } from "./order.service.js";

const session = { principal: { userId: "buyer" } } as Session;

for (const image of ["https://images.example.test/product.jpg", null]) {
  test(`customer order carries product media or null: ${image !== null}`, async () => {
    const client = { order: { findFirst: async (query: any) => {
      assert.deepEqual(query.where, { id: "order", userId: "buyer" });
      assert.equal(query.include.vendorOrders.include.items.include.product.select.media.take, 1);
      assert.deepEqual(query.include.vendorOrders.include.items.include.returnItems.where, { returnRequest: { status: { notIn: ["REJECTED", "CLOSED"] } } });
      return {
        id: "order", orderNumber: "AG-1", status: "CONFIRMED", currency: "BDT", subtotalMinor: 100n, discountMinor: 0n, deliveryMinor: 0n, taxMinor: 0n, totalMinor: 100n, version: 1, createdAt: new Date(), addresses: [], payments: [],
        vendorOrders: [{ id: "package", status: "DELIVERED", vendor: { displayName: "Seller" }, shop: { name: "Shop" }, shipments: [], subtotalMinor: 100n, discountMinor: 0n, deliveryMinor: 0n, totalMinor: 100n, commissionMinor: 6n, items: [{ id: "item", productNameSnapshot: "Purchased name", skuSnapshot: "SKU", currency: "BDT", unitPriceMinor: 100n, discountMinor: 0n, lineTotalMinor: 100n, quantity: 3, returnItems: image ? [{ quantity: 1 }, { quantity: 1 }] : [], product: { media: image ? [{ storageKey: image }] : [] } }] }]
      };
    } } };
    const result = await new OrderService(client as never).customerOrder(session, "order");
    const item = result.vendorOrders[0]?.items[0];
    assert.ok(item);
    assert.equal(item.thumbnailUrl, image);
    assert.equal(item.productName, "Purchased name");
    assert.equal(item.lineTotal.amountMinor, "100");
    assert.equal(item.returnableQuantity, image ? 1 : 3);
  });
}

test("customer image query does not bypass order ownership", async () => {
  const client = { order: { findFirst: async (query: any) => {
    assert.equal(query.where.userId, "buyer");
    return null;
  } } };
  await assert.rejects(new OrderService(client as never).customerOrder(session, "other-order"), /Order not found/);
});
