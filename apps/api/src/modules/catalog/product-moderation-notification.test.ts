import assert from "node:assert/strict";
import test from "node:test";
import type { Prisma } from "@prisma/client";
import { notifyProductModeration } from "./catalog.service.js";

test("product moderation notifies active seller members with the listing route", async () => {
  const created: Array<Record<string, unknown>> = [];
  const transaction = {
    vendorMember: { findMany: async () => [{ userId: "owner-1" }, { userId: "staff-1" }] },
    notification: { upsert: async ({ create }: { create: Record<string, unknown> }) => { created.push(create); } }
  } as unknown as Prisma.TransactionClient;

  await notifyProductModeration(transaction, { productId: "product-1", productName: "Village Honey", vendorId: "vendor-1", decisionVersion: 4, status: "REJECTED", reason: "Replace the cover photo" });

  assert.equal(created.length, 2);
  assert.equal(created[0]?.type, "vendor.product.rejected");
  assert.equal(created[0]?.body, "Village Honey needs changes: Replace the cover photo");
  assert.deepEqual(created[0]?.data, { href: "/vendor/products/product-1", productId: "product-1" });
  assert.equal(created[0]?.idempotencyKey, "vendor-product-rejected:product-1:4:owner-1");
});

test("approved product notifications use live marketplace copy", async () => {
  let body = "";
  const transaction = {
    vendorMember: { findMany: async () => [{ userId: "owner-1" }] },
    notification: { upsert: async ({ create }: { create: { body: string } }) => { body = create.body; } }
  } as unknown as Prisma.TransactionClient;
  await notifyProductModeration(transaction, { productId: "product-1", productName: "Village Honey", vendorId: "vendor-1", decisionVersion: 5, status: "APPROVED" });
  assert.equal(body, "Village Honey is now live in the marketplace.");
});
