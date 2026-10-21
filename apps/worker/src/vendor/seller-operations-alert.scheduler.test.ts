import assert from "node:assert/strict";
import test from "node:test";
import type { PrismaClient } from "@prisma/client";
import { sellerAlertPushEnabled, SellerOperationsAlertScheduler, shipmentAlertDue } from "./seller-operations-alert.scheduler.js";

test("seller operation preferences default safely and honor explicit opt-out", () => {
  assert.equal(sellerAlertPushEnabled(undefined, "lowStock"), true);
  assert.equal(sellerAlertPushEnabled({ notificationPreferences: { lowStock: { push: false } } }, "lowStock"), false);
  assert.equal(sellerAlertPushEnabled({ notificationPreferences: { shipmentDue: { push: true } } }, "shipmentDue"), true);
});

test("shipment warning starts at the exact eighteen-hour boundary", () => {
  const created = new Date("2026-10-20T00:00:00.000Z");
  assert.equal(shipmentAlertDue(created, new Date("2026-10-20T17:59:59.999Z")), false);
  assert.equal(shipmentAlertDue(created, new Date("2026-10-20T18:00:00.000Z")), true);
});

function fixture(push: boolean) {
  const notifications: any[] = [];
  const outbox: any[] = [];
  const transaction = {
    inventoryItem: { findFirst: async () => ({ id: "inventory", onHand: 3, reserved: 2, reorderLevel: 2, version: 4, variant: { sku: "SKU-1", product: { vendorId: "vendor", name: "Village Rice", shop: { settings: { notificationPreferences: { lowStock: { push } } } } } } }) },
    vendorMember: { findMany: async () => [{ userId: "owner" }, { userId: "owner" }] },
    notification: { upsert: async ({ create }: any) => { notifications.push(create); return { deliveries: create.deliveries.create.map((delivery: any, index: number) => ({ ...delivery, id: `delivery-${index}` })) }; } },
    outboxEvent: { upsert: async ({ create }: any) => { outbox.push(create); } }
  };
  const client = { $transaction: async (operation: (value: typeof transaction) => unknown) => operation(transaction) } as unknown as PrismaClient;
  return { scheduler: new SellerOperationsAlertScheduler(client, () => undefined), notifications, outbox };
}

test("low-stock alerts deduplicate members and queue push only when enabled", async () => {
  for (const push of [true, false]) {
    const context = fixture(push);
    assert.equal(await context.scheduler.deliverLowStock("inventory"), true);
    assert.equal(context.notifications.length, 1);
    assert.equal(context.notifications[0].idempotencyKey, "vendor-low-stock:inventory:4:owner");
    assert.deepEqual(context.notifications[0].deliveries.create.map((item: any) => item.channel), push ? ["in_app", "push"] : ["in_app"]);
    assert.equal(context.outbox.length, push ? 1 : 0);
  }
});

test("due shipments route sellers to the owned package and honor push preference", async () => {
  const notifications: any[] = [];
  const transaction = {
    vendorOrder: { findFirst: async () => ({ id: "package", vendorId: "vendor", status: "PROCESSING", createdAt: new Date("2026-10-20T00:00:00.000Z"), updatedAt: new Date("2026-10-20T10:00:00.000Z"), order: { orderNumber: "AGO-300" }, shop: { settings: { notificationPreferences: { shipmentDue: { push: false } } } } }) },
    vendorMember: { findMany: async () => [{ userId: "owner" }] },
    notification: { upsert: async ({ create }: any) => { notifications.push(create); return { deliveries: create.deliveries.create.map((delivery: any, index: number) => ({ ...delivery, id: `delivery-${index}` })) }; } },
    outboxEvent: { upsert: async () => assert.fail("push outbox must stay disabled") }
  };
  const client = { $transaction: async (operation: (value: typeof transaction) => unknown) => operation(transaction) } as unknown as PrismaClient;
  const scheduler = new SellerOperationsAlertScheduler(client, () => undefined);
  assert.equal(await scheduler.deliverShipmentDue("package", new Date("2026-10-20T18:00:00.000Z")), true);
  assert.equal(notifications[0].data.href, "/vendor/order/package");
  assert.equal(notifications[0].idempotencyKey, "vendor-shipment-due:package:2026-10-20T10:00:00.000Z:owner");
  assert.deepEqual(notifications[0].deliveries.create.map((item: any) => item.channel), ["in_app"]);
});
