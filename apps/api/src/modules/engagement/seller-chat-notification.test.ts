import assert from "node:assert/strict";
import test from "node:test";
import type { PrismaClient } from "@prisma/client";
import { EngagementService } from "./engagement.service.js";

const session = { principal: { userId: "customer", roles: ["CUSTOMER"], permissions: [], vendorIds: [] }, profile: { displayName: "Customer" }, status: "ACTIVE", permissions: [] } as any;

test("customer messages honor seller push opt-out and route to seller inbox", async () => {
  let created: any; let outboxWrites = 0;
  const transaction = {
    vendorShop: { findFirst: async () => ({ settings: { notificationPreferences: { customerMessage: { push: false } } } }) },
    notification: { upsert: async ({ create }: any) => { created = create; return { deliveries: [] }; } },
    outboxEvent: { upsert: async () => { outboxWrites++; } }
  };
  const client = {
    chatParticipant: { findUnique: async () => ({ role: "customer" }), findMany: async () => [{ userId: "seller", role: "vendor" }] },
    chatThread: { findUnique: async () => ({ vendorId: "vendor" }), update: async () => undefined },
    chatMessage: { create: async () => ({ id: "message" }) },
    $transaction: async (operation: (value: typeof transaction) => unknown) => operation(transaction)
  } as unknown as PrismaClient;
  await new EngagementService(client).message(session, "thread", { body: "Is this product available?" });
  assert.equal(created.data.href, "/vendor/messages/thread");
  assert.deepEqual(created.deliveries.create.map((item: any) => item.channel), ["in_app"]);
  assert.equal(outboxWrites, 0);
});
