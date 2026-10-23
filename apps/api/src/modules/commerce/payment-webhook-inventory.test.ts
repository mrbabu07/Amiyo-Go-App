import assert from "node:assert/strict";
import test from "node:test";
import type { PrismaClient } from "@prisma/client";
import { PaymentWebhookService } from "./payment-webhook.service.js";

const paymentId = "00000000-0000-4000-8000-000000000001";

test("captured payment confirms the order and consumes its inventory hold", async () => {
  const state = webhookClient("CAPTURED");
  const service = new PaymentWebhookService(state.client as PrismaClient);

  const result = await service.process("sandbox", {
    eventId: "capture-1",
    paymentId,
    status: "CAPTURED",
    transactionId: "provider-1",
    amountMinor: "1000"
  });

  assert.deepEqual(result, { received: true, duplicate: false });
  assert.deepEqual(state.inventoryWrites[0], {
    onHand: { decrement: 2 },
    reserved: { decrement: 2 },
    version: { increment: 1 },
    movements: { create: { type: "SALE", quantity: -2, referenceType: "order", referenceId: "order", idempotencyKey: "reservation-consume:reservation", metadata: { reservationId: "reservation" } } }
  });
  assert.equal(state.orderStatus, "CONFIRMED");
  assert.equal(state.reservationStatus, "CONSUMED");
});

test("failed payment cancels the order and releases its inventory hold", async () => {
  const state = webhookClient("FAILED");
  const service = new PaymentWebhookService(state.client as PrismaClient);

  await service.process("sandbox", {
    eventId: "failure-1",
    paymentId,
    status: "FAILED",
    amountMinor: "1000"
  });

  assert.deepEqual(state.inventoryWrites[0], {
    reserved: { decrement: 2 },
    version: { increment: 1 },
    movements: { create: { type: "RELEASE", quantity: 2, referenceType: "order", referenceId: "order", idempotencyKey: "reservation-release:reservation", metadata: { reservationId: "reservation", priorStatus: "ACTIVE" } } }
  });
  assert.equal(state.orderStatus, "CANCELLED");
  assert.equal(state.vendorOrderStatus, "CANCELLED");
  assert.equal(state.reservationStatus, "RELEASED");
});

function webhookClient(eventStatus: "CAPTURED" | "FAILED") {
  const state = {
    orderStatus: "PENDING_PAYMENT",
    vendorOrderStatus: "PLACED",
    reservationStatus: "ACTIVE",
    inventoryWrites: [] as unknown[],
    client: {} as unknown
  };
  const transaction = {
    $queryRaw: async () => [],
    paymentWebhook: {
      findUnique: async () => null,
      create: async () => ({ id: "webhook" }),
      update: async () => undefined
    },
    payment: {
      findUnique: async () => ({ id: paymentId, orderId: "order", amountMinor: 1000n, status: "REQUIRES_ACTION", order: { status: "PENDING_PAYMENT" } }),
      update: async () => undefined
    },
    inventoryReservation: {
      findMany: async () => [{ id: "reservation", variantId: "variant", quantity: 2, status: "ACTIVE" }],
      updateMany: async ({ data }: { data: { status: string } }) => { state.reservationStatus = data.status; return { count: 1 }; }
    },
    inventoryItem: {
      findUnique: async () => ({ id: "inventory", onHand: 5, reserved: 2 }),
      update: async ({ data }: { data: unknown }) => { state.inventoryWrites.push(data); }
    },
    vendorOrder: {
      updateMany: async ({ data }: { data: { status: string } }) => { state.vendorOrderStatus = data.status; }
    },
    order: {
      update: async ({ data }: { data: { status: string } }) => { state.orderStatus = data.status; }
    },
    orderStatusEvent: { create: async () => undefined },
    outboxEvent: { create: async () => undefined }
  };
  state.client = { $transaction: async (operation: (value: typeof transaction) => Promise<unknown>) => operation(transaction) };
  assert.ok(eventStatus);
  return state;
}
