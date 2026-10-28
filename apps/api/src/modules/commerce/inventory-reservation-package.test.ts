import assert from "node:assert/strict";
import test from "node:test";
import { releaseVendorOrderReservations } from "./inventory-reservation.js";

test("package rejection releases only reservations belonging to that seller package", async () => {
  const updated: string[] = [];
  const released: string[] = [];
  const transaction = {
    $queryRaw: async () => [],
    inventoryItem: {
      findUnique: async ({ where }: any) => ({ id: `inventory-${where.variantId}`, onHand: 10, reserved: 5 }),
      update: async ({ where }: any) => { updated.push(where.id); }
    },
    inventoryReservation: { updateMany: async ({ where }: any) => { released.push(where.id); return { count: 1 }; } }
  };
  const reservations = [
    { id: "package-a", variantId: "variant-a", quantity: 2, status: "ACTIVE" as const },
    { id: "package-b", variantId: "variant-b", quantity: 3, status: "ACTIVE" as const }
  ];
  assert.equal(await releaseVendorOrderReservations(transaction as never, "order", [{ variantId: "variant-a", quantity: 2 }], reservations), 1);
  assert.deepEqual(updated, ["inventory-variant-a"]);
  assert.deepEqual(released, ["package-a"]);
});

test("package rejection fails closed when reservation quantity does not match", async () => {
  const transaction = {};
  await assert.rejects(
    releaseVendorOrderReservations(transaction as never, "order", [{ variantId: "variant-a", quantity: 2 }], [{ id: "reservation", variantId: "variant-a", quantity: 1, status: "CONSUMED" }]),
    /no longer matches/
  );
});
