import assert from "node:assert/strict";
import test from "node:test";
import type { PrismaClient } from "@prisma/client";
import type { Queue } from "bullmq";
import { DeliveryOutboxRelay } from "./delivery-outbox.relay.js";

test("relay retries the retained failed BullMQ job instead of adding a duplicate", async () => {
  let retries = 0; let additions = 0; let processed = false;
  const client = { outboxEvent: {
    updateMany: async (input: { where: { id?: string } }) => input.where.id ? { count: 1 } : { count: 0 },
    findMany: async () => [{ id: "11111111-1111-4111-8111-111111111111", payload: { dispatchId: "22222222-2222-4222-8222-222222222222", idempotencyKey: "delivery-create:22222222-2222-4222-8222-222222222222" } }],
    update: async () => { processed = true; }
  } } as unknown as PrismaClient;
  const queue = {
    getJob: async () => ({ getState: async () => "failed", retry: async () => { retries += 1; } }),
    add: async () => { additions += 1; }
  } as unknown as Queue;
  const relay = new DeliveryOutboxRelay(client, queue, () => assert.fail("relay should not fail"));
  await relay.poll();
  assert.equal(retries, 1);
  assert.equal(additions, 0);
  assert.equal(processed, true);
});
