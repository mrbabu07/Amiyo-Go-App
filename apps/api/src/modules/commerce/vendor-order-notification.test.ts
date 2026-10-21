import assert from "node:assert/strict";
import test from "node:test";
import type { Prisma } from "@prisma/client";
import { notifyOrderVendors } from "./commerce.service.js";

test("new orders notify every active seller member once with package scope", async () => {
  const created: Array<Record<string, unknown>> = [];
  const outbox: Array<Record<string, unknown>> = [];
  let memberQuery: Record<string, unknown> | undefined;
  const transaction = {
    vendorMember: { findMany: async (query: Record<string, unknown>) => { memberQuery = query; return [{ vendorId: "vendor-1", userId: "owner-1" }, { vendorId: "vendor-1", userId: "owner-1" }, { vendorId: "vendor-1", userId: "staff-1" }]; } },
    vendorShop: { findMany: async () => [{ vendorId: "vendor-1", settings: { notificationPreferences: { newOrder: { push: true } } } }] },
    notification: { upsert: async ({ create }: { create: Record<string, any> }) => { created.push(create); return { deliveries: [{ id: `push-${created.length}`, status: "PENDING" }] }; } },
    outboxEvent: { upsert: async ({ create }: { create: Record<string, unknown> }) => { outbox.push(create); } }
  } as unknown as Prisma.TransactionClient;

  await notifyOrderVendors(transaction, { id: "order-1", orderNumber: "AGO-100" }, [{ id: "package-1", vendorId: "vendor-1", itemCount: 2, totalMinor: 123456n }]);

  assert.deepEqual(memberQuery, { where: { vendorId: { in: ["vendor-1"] }, status: "active", user: { status: "ACTIVE" } }, select: { userId: true, vendorId: true } });
  assert.equal(created.length, 2);
  assert.deepEqual(created.map((item) => item.userId).sort(), ["owner-1", "staff-1"]);
  assert.equal(created[0]?.type, "vendor.order.placed");
  assert.equal(created[0]?.body, "2 product lines worth BDT 1,234.56 require fulfillment.");
  assert.deepEqual(created[0]?.data, { href: "/vendor/order/package-1", orderId: "order-1", vendorOrderId: "package-1" });
  assert.equal(created[0]?.idempotencyKey, "vendor-order-placed:order-1:vendor-1:owner-1");
  assert.equal(outbox.length, 2);
  assert.deepEqual((created[0]?.deliveries as { create: Array<{ channel: string }> }).create.map((item) => item.channel), ["in_app", "push"]);
});

test("seller new-order push opt-out preserves the in-app notification", async () => {
  let created: Record<string, any> | undefined; let outboxWrites = 0;
  const transaction = { vendorMember: { findMany: async () => [{ vendorId: "vendor-1", userId: "owner-1" }] }, vendorShop: { findMany: async () => [{ vendorId: "vendor-1", settings: { notificationPreferences: { newOrder: { push: false } } } }] }, notification: { upsert: async ({ create }: any) => { created = create; return { deliveries: [] }; } }, outboxEvent: { upsert: async () => { outboxWrites++; } } } as unknown as Prisma.TransactionClient;
  await notifyOrderVendors(transaction, { id: "order-1", orderNumber: "AGO-100" }, [{ id: "package-1", vendorId: "vendor-1", itemCount: 1, totalMinor: 1000n }]);
  assert.deepEqual(created?.deliveries.create.map((item: any) => item.channel), ["in_app"]);
  assert.equal(outboxWrites, 0);
});

test("an order without seller packages does not query members", async () => {
  let queried = false;
  const transaction = { vendorMember: { findMany: async () => { queried = true; return []; } }, vendorShop: { findMany: async () => { queried = true; return []; } } } as unknown as Prisma.TransactionClient;
  await notifyOrderVendors(transaction, { id: "order-1", orderNumber: "AGO-100" }, []);
  assert.equal(queried, false);
});
