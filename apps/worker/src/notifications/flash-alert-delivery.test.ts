import assert from "node:assert/strict";
import test from "node:test";
import type { Notification, PrismaClient } from "@prisma/client";
import { canDeliverFlashAlert } from "./flash-alert-delivery.js";

const now = new Date("2026-10-08T12:00:00Z");
test("queued flash delivery rechecks expiry, feature flag, inventory and recipient preference", async () => {
  const notification: Notification = { id: "notification", title: "Flash offer", body: "A saved product is on sale", readAt: null, createdAt: now, idempotencyKey: null, type: "product.flash_sale", userId: "owner", data: { flashSaleId: "11111111-1111-4111-8111-111111111111", productId: "22222222-2222-4222-8222-222222222222" } };
  const entry = { flashSaleId: "sale", priceMinor: 100n, quantityLimit: 4, soldCount: 0, flashSale: { status: "active", startsAt: new Date(now.getTime() - 1), endsAt: new Date(now.getTime() + 1) }, product: { status: "APPROVED", shop: { status: "ACTIVE" }, vendor: { status: "APPROVED" }, variants: [{ id: "variant", currency: "BDT", active: true, priceMinor: 200n, inventory: { onHand: 5, reserved: 1 } }] } };
  const flags = { flashSales: true };
  const user = { status: "ACTIVE", deletedAt: null, profile: { preferences: { notificationPreferences: { priceDrops: { email: true, push: true } } } } };
  const client = { flashSaleProduct: { findUnique: async () => entry }, platformConfiguration: { findUnique: async () => ({ featureFlags: flags }) }, user: { findUnique: async () => user } } as unknown as PrismaClient;
  assert.equal(await canDeliverFlashAlert(client, notification, "email", now), true);
  assert.equal(await canDeliverFlashAlert(client, notification, "push", new Date(now.getTime() + 1)), false);
  flags.flashSales = false;
  assert.equal(await canDeliverFlashAlert(client, notification, "push", now), false);
  flags.flashSales = true;
  entry.soldCount = 4;
  assert.equal(await canDeliverFlashAlert(client, notification, "push", now), false);
  entry.soldCount = 0;
  user.profile.preferences.notificationPreferences.priceDrops.email = false;
  assert.equal(await canDeliverFlashAlert(client, notification, "email", now), false);
  assert.equal(await canDeliverFlashAlert(client, notification, "push", now), true);
  entry.product.variants[0]!.inventory.reserved = 5;
  assert.equal(await canDeliverFlashAlert(client, notification, "push", now), false);
});

test("missing flash identifiers fail closed without affecting other notification types", async () => {
  const client = {} as PrismaClient;
  assert.equal(await canDeliverFlashAlert(client, { type: "product.flash_sale", data: null } as Notification, "email", now), false);
  assert.equal(await canDeliverFlashAlert(client, { type: "order.created" } as Notification, "push", now), true);
});
