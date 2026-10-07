import assert from "node:assert/strict";
import test from "node:test";
import type { PrismaClient } from "@prisma/client";
import { matchingAlertVariant, productAlertPushEnabled, ProductAlertScheduler } from "./product-alert.scheduler.js";

const variant = { id: "variant", active: true, currency: "BDT", priceMinor: 500n, inventory: { onHand: 2, reserved: 1 } };

test("alerts require a purchasable option and honor inclusive target prices without numeric rounding", () => {
  assert.equal(matchingAlertVariant([variant], 500n)?.id, "variant");
  assert.equal(matchingAlertVariant([variant], 499n), undefined);
  assert.equal(matchingAlertVariant([variant], 0n), undefined);
  assert.equal(matchingAlertVariant([variant], null)?.id, "variant");
  for (const unavailable of [{ ...variant, active: false }, { ...variant, currency: "USD" }, { ...variant, inventory: null }, { ...variant, inventory: { onHand: 2, reserved: 2 } }]) {
    assert.equal(matchingAlertVariant([unavailable], null), undefined);
  }
  const expensive = { ...variant, priceMinor: 9007199254740993n };
  assert.equal(matchingAlertVariant([expensive], 9007199254740992n), undefined);
  assert.equal(matchingAlertVariant([expensive, variant], null)?.priceMinor, 500n);
});

test("product alerts honor the customer's saved push opt-out", () => {
  assert.equal(productAlertPushEnabled(undefined), true);
  assert.equal(productAlertPushEnabled({ notificationPreferences: { priceDrops: { push: false } } }), false);
  assert.equal(productAlertPushEnabled({ notificationPreferences: { priceDrops: { push: true } } }), true);
});

function fixture(push = true) {
  let active = true;
  let failOutbox = false;
  const notifications: any[] = [];
  const outbox: any[] = [];
  const transaction = {
    stockAlert: {
      findFirst: async (input: any) => {
        assert.equal(input.where.user.status, "ACTIVE");
        assert.equal(input.where.user.deletedAt, null);
        assert.equal(input.where.product.shop.status, "ACTIVE");
        assert.equal(input.where.product.vendor.status, "APPROVED");
        assert.equal(input.where.product.status, "APPROVED");
        return active ? { id: "alert", userId: "customer", productId: "product", targetMinor: 500n, user: { profile: { preferences: { notificationPreferences: { priceDrops: { push } } } } }, product: { name: "Product", slug: "product", variants: [variant] } } : null;
      },
      updateMany: async (input: any) => {
        assert.deepEqual(input.where, { id: "alert", active: true });
        if (!active) return { count: 0 };
        active = input.data.active;
        return { count: 1 };
      }
    },
    notification: { create: async (input: any) => {
      notifications.push(input.data);
      return { deliveries: input.data.deliveries.create.map((delivery: any) => ({ ...delivery, id: delivery.channel })) };
    } },
    outboxEvent: { create: async (input: any) => {
      if (failOutbox) throw new Error("outbox unavailable");
      outbox.push(input.data);
    } }
  };
  const client = { $transaction: async (operation: (transaction: any) => Promise<unknown>, options: any) => {
    assert.equal(options.isolationLevel, "Serializable");
    const before = { active, notifications: notifications.length, outbox: outbox.length };
    try { return await operation(transaction); } catch (error) {
      active = before.active;
      notifications.length = before.notifications;
      outbox.length = before.outbox;
      throw error;
    }
  } } as unknown as PrismaClient;
  return { scheduler: new ProductAlertScheduler(client, () => {}), notifications, outbox, rearm: () => { active = true; }, fail: (value: boolean) => { failOutbox = value; } };
}

test("a matched subscription queues once and a deliberate re-subscription can notify again", async () => {
  const context = fixture();
  assert.equal(await context.scheduler.deliver("alert"), true);
  assert.equal(await context.scheduler.deliver("alert"), false);
  assert.equal(context.notifications.length, 1);
  assert.equal(context.outbox.length, 1);
  assert.equal(context.notifications[0].data.href, "/product/product");
  assert.equal(context.notifications[0].data.priceMinor, "500");
  context.rearm();
  await context.scheduler.deliver("alert");
  assert.notEqual(context.notifications[0].idempotencyKey, context.notifications[1].idempotencyKey);
});

test("notification and claim roll back together when enqueueing fails", async () => {
  const context = fixture();
  context.fail(true);
  await assert.rejects(context.scheduler.deliver("alert"), /outbox unavailable/);
  assert.equal(context.notifications.length, 0);
  context.fail(false);
  assert.equal(await context.scheduler.deliver("alert"), true);
  assert.equal(context.outbox.length, 1);
});

test("opted-out push remains an in-app alert without a push outbox event", async () => {
  const context = fixture(false);
  await context.scheduler.deliver("alert");
  assert.equal(context.outbox.length, 0);
  assert.equal(context.notifications[0].deliveries.create.length, 1);
  assert.equal(context.notifications[0].deliveries.create[0].status, "DELIVERED");
});

test("bounded polling advances past unmatched alerts and continues after one failure", async () => {
  const queries: any[] = [];
  const errors: unknown[] = [];
  const ids: string[] = [];
  const client = { stockAlert: { findMany: async (input: any) => {
    queries.push(input);
    return queries.length === 1 ? Array.from({ length: 250 }, (_, index) => ({ id: String(index).padStart(3, "0") })) : [];
  } } } as unknown as PrismaClient;
  const scheduler = new ProductAlertScheduler(client, (error) => errors.push(error));
  scheduler.deliver = async (id) => { ids.push(id); if (id === "000") throw new Error("retry later"); return false; };
  await scheduler.poll();
  await scheduler.poll();
  await scheduler.poll();
  assert.equal(ids.length, 250);
  assert.equal(errors.length, 1);
  assert.deepEqual(queries[1].where.id, { gt: "249" });
  assert.equal(queries[2].where.id, undefined);
});
