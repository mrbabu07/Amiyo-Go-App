import assert from "node:assert/strict";
import test from "node:test";
import type { PrismaClient } from "@prisma/client";
import type { Session } from "@amiyo/contracts";
import { OperationsService } from "./operations.service.js";

const userId = "11111111-1111-4111-8111-111111111111";
const orderId = "22222222-2222-4222-8222-222222222222";
const key = "33333333-3333-4333-8333-333333333333";
const customer: Session = { principal: { userId, roles: ["CUSTOMER"], vendorIds: [] }, status: "ACTIVE", email: null, phone: null, profile: { firstName: null, lastName: null, displayName: "Customer", avatarStorageKey: null, locale: "en", currency: "BDT" }, permissions: ["orders:read"], vendorMemberships: [] };

function clientFor(order: Record<string, unknown>, calls: string[] = []) {
  const transaction = {
    idempotencyRecord: { findUnique: async () => null, create: async () => { calls.push("idempotency"); } },
    order: { findFirst: async () => order, update: async () => { calls.push("order"); } },
    inventoryItem: { findUniqueOrThrow: async () => null, update: async () => { calls.push("inventory"); } },
    inventoryReservation: { updateMany: async () => { calls.push("reservations"); } },
    vendorOrder: { updateMany: async () => { calls.push("vendor-orders"); } },
    payment: { update: async () => { calls.push("payment"); } },
    refund: { create: async () => { calls.push("refund"); } },
    outboxEvent: { create: async () => { calls.push("outbox"); } },
    auditLog: { create: async () => { calls.push("audit"); } }
  };
  return { client: { $transaction: async (operation: (value: unknown) => unknown) => operation(transaction) } as unknown as PrismaClient, calls };
}

test("customers can cancel their own order with order read access inside 30 minutes", async () => {
  const { client, calls } = clientFor({ id: orderId, userId, status: "CONFIRMED", version: 2, placedAt: new Date(Date.now() - 5 * 60_000), createdAt: new Date(Date.now() - 5 * 60_000), vendorOrders: [{ status: "PLACED" }], payments: [], reservations: [] });
  const result = await new OperationsService(client).cancelOrder(customer, orderId, { reason: "Changed my mind", expectedVersion: 2 }, key);
  assert.deepEqual(result, { id: orderId, status: "CANCELLED", version: 3 });
  assert.deepEqual(calls, ["reservations", "vendor-orders", "order", "outbox", "audit", "idempotency"]);
});

test("customer cancellation expires 30 minutes after placement", async () => {
  const { client, calls } = clientFor({ id: orderId, userId, status: "CONFIRMED", version: 2, placedAt: new Date(Date.now() - 31 * 60_000), createdAt: new Date(Date.now() - 31 * 60_000), vendorOrders: [{ status: "PLACED" }], payments: [], reservations: [] });
  await assert.rejects(() => new OperationsService(client).cancelOrder(customer, orderId, { reason: "Changed my mind", expectedVersion: 2 }, key), /within 30 minutes/);
  assert.deepEqual(calls, []);
});
