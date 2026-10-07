import assert from "node:assert/strict";
import test from "node:test";
import type { Job } from "bullmq";
import type { Notification, NotificationDelivery, PrismaClient } from "@prisma/client";
import type { NewsletterEmail } from "../email/resend-email.provider.js";
import { createNotificationProcessor } from "./notification.processor.js";
import { alertEmailProductUrl, deliverProductAlertEmail } from "./product-alert-email.js";

const now = new Date("2026-10-07T12:00:00Z");
function fixture() {
  const delivery: NotificationDelivery & { notification: Notification } = { id: "11111111-1111-4111-8111-111111111111", notificationId: "notification", channel: "email", status: "PENDING", provider: null, providerRef: null, errorCode: null, attemptedAt: null, deliveredAt: null, notification: { id: "notification", userId: "customer", type: "product.target_price", title: "Target reached", body: "Product is available", data: { href: "/product/demo-product" }, createdAt: now, readAt: null, idempotencyKey: null } };
  const user = { status: "ACTIVE", deletedAt: null as Date | null, normalizedEmail: "demo@example.test" as string | null, profile: { preferences: { notificationPreferences: { priceDrops: { email: true } } } } };
  const sent: NewsletterEmail[] = [];
  const updates: Array<Record<string, unknown>> = [];
  let fail = false;
  let failSave = false;
  const client = {
    user: { findUnique: async () => user },
    notificationDelivery: {
      findUnique: async () => delivery,
      update: async ({ data }: { data: Record<string, unknown> }) => {
        if (failSave && data.status === "DELIVERED") throw new Error("database unavailable");
        updates.push(data); Object.assign(delivery, data);
      }
    }
  } as unknown as PrismaClient;
  const config = { appPublicUrl: "https://app.example.test", provider: { name: "fake-resend", send: async (message: NewsletterEmail) => { sent.push(message); if (fail) throw new Error("provider timeout"); return { id: "receipt" }; } } };
  return { delivery, user, client, config, sent, updates, fail: () => { fail = true; }, failSave: (value: boolean) => { failSave = value; } };
}

test("alert email uses a stable provider key, plain text and records provider acceptance", async () => {
  const context = fixture();
  await deliverProductAlertEmail(context.client, context.delivery, context.config, now);
  assert.equal(context.sent[0]?.idempotencyKey, `product-alert-email-${context.delivery.id}`);
  assert.equal(context.sent[0]?.to, "demo@example.test");
  assert.match(context.sent[0]!.text, /https:\/\/app.example.test\/product\/demo-product/);
  assert.match(context.sent[0]!.text, /Account notification preferences/);
  assert.equal(context.delivery.providerRef, "receipt");
  assert.equal(context.delivery.status, "DELIVERED");
  const processor = createNotificationProcessor(context.client, { send: async () => { throw new Error("wrong channel"); } }, context.config);
  await processor({ data: { notificationDeliveryId: context.delivery.id } } as Job);
  assert.equal(context.sent.length, 1);
});

test("email rechecks customer opt-out, account state and address at send time", async () => {
  for (const reason of ["EMAIL_OPTED_OUT", "RECIPIENT_INACTIVE", "NO_EMAIL_ADDRESS"]) {
    const context = fixture();
    if (reason === "EMAIL_OPTED_OUT") context.user.profile.preferences.notificationPreferences.priceDrops.email = false;
    if (reason === "RECIPIENT_INACTIVE") context.user.deletedAt = now;
    if (reason === "NO_EMAIL_ADDRESS") context.user.normalizedEmail = null;
    await deliverProductAlertEmail(context.client, context.delivery, context.config, now);
    assert.equal(context.sent.length, 0);
    assert.equal(context.delivery.errorCode, reason);
  }
});

test("notification worker dispatches pending alert emails to email rather than push", async () => {
  const context = fixture();
  context.delivery.notification.createdAt = new Date(Date.now() - 1000);
  const processor = createNotificationProcessor(context.client, { send: async () => { throw new Error("Email must not use push"); } }, context.config);
  await processor({ data: { notificationDeliveryId: context.delivery.id } } as Job);
  assert.equal(context.sent.length, 1);
  assert.equal(context.delivery.status, "DELIVERED");
});

test("old or future-dated email jobs do not replay outside the safety window", async () => {
  for (const age of [23 * 60 * 60_000, 25 * 60 * 60_000, -1]) {
    const context = fixture();
    context.delivery.notification.createdAt = new Date(now.getTime() - age);
    await deliverProductAlertEmail(context.client, context.delivery, context.config, now);
    assert.equal(context.delivery.errorCode, "EMAIL_RETRY_WINDOW_EXPIRED");
    assert.equal(context.sent.length, 0);
  }
});

test("unconfirmed sends fail the job and persistence retries retain the same provider key", async () => {
  const context = fixture();
  context.failSave(true);
  await assert.rejects(deliverProductAlertEmail(context.client, context.delivery, context.config, now), /database unavailable/);
  assert.equal(context.delivery.errorCode, "EMAIL_DELIVERY_UNCONFIRMED");
  context.failSave(false);
  await deliverProductAlertEmail(context.client, context.delivery, context.config, now);
  assert.deepEqual(context.sent[0], context.sent[1]);
  const failed = fixture(); failed.fail();
  await assert.rejects(deliverProductAlertEmail(failed.client, failed.delivery, failed.config, now), /provider timeout/);
  assert.equal(failed.delivery.status, "FAILED");
});

test("product links cannot redirect to another origin or embed arbitrary schemes", () => {
  for (const href of ["https://evil.test", "//evil.test", "/product/../auth", "/product/%2f%2fevil.test", "/product/demo?next=evil"]) {
    assert.equal(alertEmailProductUrl("https://app.example.test", { href }), null);
  }
  for (const base of [undefined, "javascript:alert(1)", "https://user:password@app.example.test", "invalid"]) {
    assert.equal(alertEmailProductUrl(base, { href: "/product/demo" }), null);
  }
});

test("unsupported email types and missing app URL fail closed", async () => {
  const context = fixture();
  context.delivery.notification.type = "order.created";
  await deliverProductAlertEmail(context.client, context.delivery, context.config, now);
  assert.equal(context.delivery.errorCode, "EMAIL_TYPE_NOT_CONFIGURED");
  context.delivery.notification.type = "product.back_in_stock";
  await deliverProductAlertEmail(context.client, context.delivery, { provider: context.config.provider }, now);
  assert.equal(context.delivery.errorCode, "EMAIL_APP_URL_INVALID");
  assert.equal(context.sent.length, 0);
});
