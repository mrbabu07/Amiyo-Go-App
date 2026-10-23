import assert from "node:assert/strict";
import test from "node:test";
import { consumeOrderReservations, releaseOrderReservations } from "./inventory-reservation.js";

test("captured payment consumes reserved stock exactly once", async () => {
  const writes: unknown[] = [];
  const transaction = client({ onHand: 5, reserved: 2 }, writes, "ACTIVE");
  await consumeOrderReservations(transaction as never, "order");
  const inventory = writes[0] as { onHand: { decrement: number }; reserved: { decrement: number }; movements: { create: { type: string; quantity: number } } };
  assert.deepEqual(inventory.onHand, { decrement: 2 });
  assert.deepEqual(inventory.reserved, { decrement: 2 });
  assert.equal(inventory.movements.create.type, "SALE");
  assert.equal(inventory.movements.create.quantity, -2);
});

test("cancellation releases active holds and restores consumed stock", async () => {
  const activeWrites: unknown[] = [];
  await releaseOrderReservations(client({ onHand: 5, reserved: 2 }, activeWrites, "ACTIVE") as never, "order", [{ id: "reservation", variantId: "variant", quantity: 2, status: "ACTIVE" }]);
  assert.deepEqual((activeWrites[0] as { reserved: unknown }).reserved, { decrement: 2 });
  const consumedWrites: unknown[] = [];
  await releaseOrderReservations(client({ onHand: 3, reserved: 0 }, consumedWrites, "CONSUMED") as never, "order", [{ id: "reservation", variantId: "variant", quantity: 2, status: "CONSUMED" }]);
  assert.deepEqual((consumedWrites[0] as { onHand: unknown }).onHand, { increment: 2 });
});

function client(inventory: { onHand: number; reserved: number }, writes: unknown[], status: "ACTIVE" | "CONSUMED") {
  return {
    $queryRaw: async () => [],
    inventoryReservation: {
      findMany: async () => [{ id: "reservation", variantId: "variant", quantity: 2, status }],
      updateMany: async () => ({ count: 1 })
    },
    inventoryItem: {
      findUnique: async () => ({ id: "inventory", ...inventory }),
      update: async ({ data }: { data: unknown }) => { writes.push(data); }
    }
  };
}
