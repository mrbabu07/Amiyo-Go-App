import assert from "node:assert/strict";
import test from "node:test";
import type { PrismaClient } from "@prisma/client";
import { eligibleFlashSale, FlashAlertScheduler } from "./flash-alert.scheduler.js";

const now = new Date("2026-10-08T12:00:00Z");
const sale = { flashSaleId: "sale", priceMinor: 500n, quantityLimit: 10, soldCount: 3, flashSale: { status: "active", startsAt: new Date(now.getTime() - 1000), endsAt: new Date(now.getTime() + 1000) } };

test("flash eligibility requires a real reduction, active window and remaining allocation", () => {
  assert.equal(eligibleFlashSale([sale], 1000n, now)?.flashSaleId, "sale");
  assert.equal(eligibleFlashSale([{ ...sale, quantityLimit: null }], 1000n, now)?.flashSaleId, "sale");
  for (const invalid of [
    { ...sale, priceMinor: 1000n }, { ...sale, priceMinor: -1n }, { ...sale, soldCount: 10 },
    { ...sale, flashSale: { ...sale.flashSale, status: "draft" } },
    { ...sale, flashSale: { ...sale.flashSale, startsAt: new Date(now.getTime() + 1) } },
    { ...sale, flashSale: { ...sale.flashSale, endsAt: now } }
  ]) assert.equal(eligibleFlashSale([invalid], 1000n, now), undefined);
});

function fixture() {
  let active = true;
  let featureEnabled = true;
  let available = true;
  let failOutbox = false;
  const notifications: any[] = [];
  const events: any[] = [];
  const transaction = {
    platformConfiguration: { findUnique: async () => ({ featureFlags: { flashSales: featureEnabled } }) },
    flashSaleAlert: {
      findFirst: async ({ where }: any) => {
        assert.equal(where.user.status, "ACTIVE"); assert.equal(where.user.deletedAt, null);
        assert.equal(where.product.status, "APPROVED"); assert.equal(where.product.shop.status, "ACTIVE"); assert.equal(where.product.vendor.status, "APPROVED");
        return active ? { id: "alert", userId: "owner", productId: "product", user: { normalizedEmail: "demo@example.test", profile: { preferences: { notificationPreferences: { priceDrops: { push: false, email: true } } } } }, product: { name: "Demo", slug: "demo", flashSaleProducts: [sale], variants: [{ id: "variant", active: true, currency: "BDT", priceMinor: 1000n, inventory: { onHand: available ? 2 : 1, reserved: 1 } }] } } : null;
      },
      updateMany: async ({ where }: any) => { assert.deepEqual(where, { id: "alert", active: true }); if (!active) return { count: 0 }; active = false; return { count: 1 }; }
    },
    notification: { create: async ({ data }: any) => { notifications.push(data); return { deliveries: data.deliveries.create.map((entry: any) => ({ ...entry, id: entry.channel })) }; } },
    outboxEvent: { create: async ({ data }: any) => { if (failOutbox) throw new Error("Outbox unavailable"); events.push(data); } }
  };
  const client = { $transaction: async (operation: (transaction: any) => unknown, options: any) => {
    assert.equal(options.isolationLevel, "Serializable");
    const previousActive = active;
    const notificationCount = notifications.length;
    const eventCount = events.length;
    try { return await operation(transaction); } catch (error) {
      active = previousActive;
      notifications.length = notificationCount;
      events.length = eventCount;
      throw error;
    }
  } } as unknown as PrismaClient;
  return { scheduler: new FlashAlertScheduler(client, () => {}), notifications, events, disable: () => { featureEnabled = false; }, exhaust: () => { available = false; }, failOutbox: (value: boolean) => { failOutbox = value; }, rearm: () => { active = true; } };
}

test("flash matches create one in-app notification and preference-filtered email outbox", async () => {
  const context = fixture();
  assert.equal(await context.scheduler.deliver("alert", now), true);
  assert.equal(await context.scheduler.deliver("alert", now), false);
  assert.equal(context.notifications.length, 1);
  assert.equal(context.notifications[0].type, "product.flash_sale");
  assert.equal(context.notifications[0].data.flashSaleId, "sale");
  assert.equal(context.events.length, 1);
  assert.equal(context.events[0].aggregateId, "email");
});

test("admin-disabled flash sales and reserved inventory never notify", async () => {
  const disabled = fixture(); disabled.disable();
  assert.equal(await disabled.scheduler.deliver("alert", now), false);
  assert.equal(disabled.notifications.length, 0);
  const empty = fixture(); empty.exhaust();
  assert.equal(await empty.scheduler.deliver("alert", now), false);
  assert.equal(empty.events.length, 0);
});

test("failed flash enqueue rolls back the modeled claim and a later poll can retry", async () => {
  const context = fixture();
  context.failOutbox(true);
  await assert.rejects(context.scheduler.deliver("alert", now), /Outbox unavailable/);
  assert.equal(context.notifications.length, 0);
  assert.equal(context.events.length, 0);
  context.failOutbox(false);
  assert.equal(await context.scheduler.deliver("alert", now), true);
  assert.equal(await context.scheduler.deliver("alert", now), false);
  assert.equal(context.events.length, 1);
});

test("deliberate flash re-subscription uses a fresh notification identity", async () => {
  const context = fixture();
  await context.scheduler.deliver("alert", now);
  context.rearm();
  await context.scheduler.deliver("alert", now);
  assert.equal(context.notifications.length, 2);
  assert.notEqual(context.notifications[0].idempotencyKey, context.notifications[1].idempotencyKey);
});
