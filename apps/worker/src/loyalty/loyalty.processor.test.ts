import assert from "node:assert/strict";
import test from "node:test";
import type { PrismaClient } from "@prisma/client";
import { createLoyaltyProcessor } from "./loyalty.processor.js";

const orderId = "11111111-1111-4111-8111-111111111111";
const userId = "22222222-2222-4222-8222-222222222222";

test("loyalty worker awards delivered net merchandise spend once", async () => {
  let balanceIncrement = 0n; let createdPoints = 0n;
  const transaction = {
    loyaltyTransaction: { findUnique: async () => null, create: async ({ data }: { data: { points: bigint } }) => { createdPoints = data.points; } },
    order: { findUnique: async () => ({ id: orderId, userId, status: "DELIVERED", totalMinor: 1_100_000n, deliveryMinor: 100_000n, payments: [{ refundedMinor: 0n }] }) },
    platformConfiguration: { findUnique: async () => null },
    loyaltyAccount: { upsert: async () => ({ id: "33333333-3333-4333-8333-333333333333" }), update: async ({ data }: { data: { pointsBalance: { increment: bigint } } }) => { balanceIncrement = data.pointsBalance.increment; } },
    notification: { upsert: async () => ({}) }
  };
  const client = { $transaction: async (operation: (value: typeof transaction) => Promise<unknown>) => operation(transaction) } as unknown as PrismaClient;
  const result = await createLoyaltyProcessor(client)({ data: { orderId } });
  assert.deepEqual(result, { awarded: true, duplicate: false, points: "100" }); assert.equal(createdPoints, 100n); assert.equal(balanceIncrement, 100n);
});

test("loyalty worker is idempotent for an already-awarded order", async () => {
  const transaction = { loyaltyTransaction: { findUnique: async () => ({ points: 42n }) } };
  const client = { $transaction: async (operation: (value: typeof transaction) => Promise<unknown>) => operation(transaction) } as unknown as PrismaClient;
  assert.deepEqual(await createLoyaltyProcessor(client)({ data: { orderId } }), { awarded: false, duplicate: true, points: "42" });
});
