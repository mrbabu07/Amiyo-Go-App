import assert from "node:assert/strict";
import test from "node:test";
import { ReservationExpiryScheduler } from "./reservation-expiry.scheduler.js";

test("expired unpaid reservations release stock and close the order atomically", async () => {
  const calls: string[] = [];
  const now = new Date("2026-10-23T10:00:00.000Z");
  const transaction = {
    $queryRaw: async () => { calls.push("lock"); return []; },
    order: {
      findUnique: async () => ({ id: "order", status: "PENDING_PAYMENT", version: 2, payments: [{ id: "payment", status: "REQUIRES_ACTION" }], reservations: [{ id: "reservation", variantId: "variant", quantity: 2 }] }),
      update: async () => { calls.push("order"); }
    },
    inventoryItem: {
      findUnique: async () => ({ id: "inventory", reserved: 2 }),
      update: async ({ data }: { data: { reserved: { decrement: number }; movements: { create: { idempotencyKey: string } } } }) => { assert.equal(data.reserved.decrement, 2); assert.equal(data.movements.create.idempotencyKey, "expiry-release:reservation"); calls.push("inventory"); }
    },
    inventoryReservation: { updateMany: async () => { calls.push("reservations"); } },
    vendorOrder: { updateMany: async () => { calls.push("packages"); } },
    payment: { update: async () => { calls.push("payment"); } },
    outboxEvent: { upsert: async () => { calls.push("outbox"); } },
    auditLog: { create: async () => { calls.push("audit"); } }
  };
  const client = {
    order: { findMany: async ({ where }: { where: unknown }) => { assert.deepEqual(where, { status: "PENDING_PAYMENT", reservations: { some: { status: "ACTIVE", expiresAt: { lte: now } } } }); return [{ id: "order" }]; } },
    $transaction: async (run: (value: typeof transaction) => Promise<void>) => run(transaction)
  };
  await new ReservationExpiryScheduler(client as never, () => assert.fail("unexpected scheduler failure")).poll(now);
  assert.deepEqual(calls, ["lock", "inventory", "reservations", "packages", "payment", "order", "outbox", "audit"]);
});

test("confirmed orders are not selected for reservation expiry", async () => {
  let transactions = 0;
  const client = { order: { findMany: async () => [] }, $transaction: async () => { transactions += 1; } };
  await new ReservationExpiryScheduler(client as never, () => assert.fail("unexpected scheduler failure")).poll();
  assert.equal(transactions, 0);
});
