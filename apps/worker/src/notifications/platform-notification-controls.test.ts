import assert from "node:assert/strict";
import test from "node:test";
import type { PrismaClient } from "@prisma/client";
import { notificationControlForType, notificationDeliveryEnabled } from "./platform-notification-controls.js";

test("notification types map to the admin message classes", () => {
  assert.equal(notificationControlForType("order.status.changed"), "orderUpdates");
  assert.equal(notificationControlForType("product.flash_sale"), "promotions");
  assert.equal(notificationControlForType("vendor.inventory.low_stock"), "sellerAlerts");
  assert.equal(notificationControlForType("admin.order.placed"), "adminAlerts");
  assert.equal(notificationControlForType("admin.broadcast"), "promotions");
  assert.equal(notificationControlForType("chat.message.created"), null);
});

test("missing configuration is fail-open while explicit pause is enforced", async () => {
  const missing = {} as PrismaClient;
  assert.equal(await notificationDeliveryEnabled(missing, "order.status.changed"), true);
  const configured = { platformConfiguration: { findUnique: async () => ({ notificationControls: { promotions: false } }) } } as unknown as PrismaClient;
  assert.equal(await notificationDeliveryEnabled(configured, "product.target_price"), false);
  assert.equal(await notificationDeliveryEnabled(configured, "order.status.changed"), true);
});
