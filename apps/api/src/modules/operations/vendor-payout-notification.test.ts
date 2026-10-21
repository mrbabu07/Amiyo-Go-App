import assert from "node:assert/strict";
import test from "node:test";
import type { Prisma } from "@prisma/client";
import { notifyVendorPayoutStatus, notifyVendorReturnRequested } from "./operations.service.js";

test("payout decisions notify active seller members once with finance routing", async () => {
  const created: Array<Record<string, unknown>> = [];
  const transaction = {
    vendorMember: { findMany: async () => [{ userId: "owner-1" }, { userId: "owner-1" }, { userId: "finance-1" }] },
    vendorShop: { findFirst: async () => ({ settings: { notificationPreferences: { payoutUpdate: { push: true } } } }) },
    notification: { upsert: async ({ create }: { create: Record<string, unknown> }) => { created.push(create); return { deliveries: [{ id: `delivery-${created.length}`, status: "PENDING" }] }; } },
    outboxEvent: { upsert: async () => undefined }
  } as unknown as Prisma.TransactionClient;

  await notifyVendorPayoutStatus(transaction, { requestId: "request-1", vendorId: "vendor-1", amountMinor: 250050n, status: "REJECTED", reason: "Bank details do not match" });

  assert.equal(created.length, 2);
  assert.deepEqual(created.map((item) => item.userId).sort(), ["finance-1", "owner-1"]);
  assert.equal(created[0]?.type, "vendor.payout.rejected");
  assert.equal(created[0]?.body, "Your BDT 2,500.50 payout request was rejected: Bank details do not match.");
  assert.deepEqual(created[0]?.data, { href: "/vendor/finance/payouts", payoutRequestId: "request-1" });
});

test("paid payout notification preserves exact minor units", async () => {
  let created: Record<string, unknown> | undefined;
  const transaction = {
    vendorMember: { findMany: async () => [{ userId: "owner-1" }] },
    vendorShop: { findFirst: async () => ({ settings: { notificationPreferences: { payoutUpdate: { push: false } } } }) },
    notification: { upsert: async (input: { create: Record<string, unknown> }) => { created = input.create; return { deliveries: [] }; } },
    outboxEvent: { upsert: async () => undefined }
  } as unknown as Prisma.TransactionClient;

  await notifyVendorPayoutStatus(transaction, { requestId: "request-2", vendorId: "vendor-1", amountMinor: 50000n, status: "PAID" });
  assert.equal(created?.body, "Your BDT 500.00 payout request has been paid.");
  assert.equal(created?.idempotencyKey, "vendor-payout-paid:request-2:owner-1");
  assert.deepEqual((created?.deliveries as { create: Array<{ channel: string }> }).create.map((item) => item.channel), ["in_app"]);
});

test("new returns notify the seller with the owned case route", async () => {
  let created: Record<string, unknown> | undefined;
  const transaction = {
    vendorMember: { findMany: async () => [{ userId: "owner-1" }] },
    vendorShop: { findFirst: async () => ({ settings: { notificationPreferences: { returnRequest: { push: true } } } }) },
    notification: { upsert: async (input: { create: Record<string, unknown> }) => { created = input.create; return { deliveries: [{ id: "delivery-return", status: "PENDING" }] }; } },
    outboxEvent: { upsert: async () => undefined }
  } as unknown as Prisma.TransactionClient;

  await notifyVendorReturnRequested(transaction, { returnId: "return-1", vendorId: "vendor-1", orderNumber: "AGO-200", reasonCode: "WRONG_ITEM" });
  assert.equal(created?.type, "vendor.return.requested");
  assert.equal(created?.body, "A customer submitted a wrong item return request that needs review.");
  assert.deepEqual(created?.data, { href: "/vendor/returns/return-1", returnId: "return-1" });
  assert.deepEqual((created?.deliveries as { create: Array<{ channel: string }> }).create.map((item) => item.channel), ["in_app", "push"]);
});
