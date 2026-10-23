import assert from "node:assert/strict";
import test from "node:test";
import type { PrismaClient } from "@prisma/client";
import type { Session } from "@amiyo/contracts";
import { OperationsService } from "./operations.service.js";
import { ApiProblem } from "../../middleware/api-problem.js";

const customer: Session = { status: "ACTIVE", principal: { userId: "customer", roles: ["CUSTOMER"], vendorIds: [] }, permissions: ["orders:read", "returns:manage"], phone: null, email: null, profile: { firstName: null, lastName: null, displayName: null, avatarStorageKey: null, locale: "en", currency: "BDT" }, vendorMemberships: [] };
const key = "00000000-0000-4000-8000-000000000001";

function replayClient(kind: "cancel" | "return", now: number) {
  const records = new Map<string, { requestHash: string; response: unknown }>();
  const effects: string[] = [];
  let loseResponse = true;
  let completed = false;
  const write = (name: string) => { effects.push(name); };
  const transaction = {
    platformConfiguration: { findUnique: async () => ({ returnPolicy: { windowDays: 7, requireEvidence: false } }) },
    idempotencyRecord: {
      findUnique: async ({ where }: { where: { scope_key: { scope: string; key: string } } }) => records.get(JSON.stringify(where.scope_key)) ?? null,
      create: async ({ data }: { data: { scope: string; key: string; requestHash: string; response: unknown } }) => {
        write("idempotency"); records.set(JSON.stringify({ scope: data.scope, key: data.key }), data); completed = true;
      }
    },
    order: {
      findFirst: async ({ where }: { where: { userId: string } }) => completed || where.userId !== "customer" ? null : { id: "order", version: 2, status: "CONFIRMED", placedAt: new Date(now), createdAt: new Date(now), vendorOrders: [{ status: "PLACED" }], payments: [{ id: "payment", status: "CAPTURED", amountMinor: 500n, refundedMinor: 0n, currency: "BDT" }], reservations: [{ id: "reservation", variantId: "variant", quantity: 2, status: "CONSUMED" }] },
      update: async () => { write("order"); }
    },
    $queryRaw: async () => [],
    inventoryItem: { findUnique: async () => ({ id: "inventory", onHand: 3, reserved: 0 }), update: async () => { write("inventory-release"); } },
    inventoryReservation: { updateMany: async () => { write("reservation-release"); return { count: 1 }; } },
    vendorOrder: {
      updateMany: async () => { write("packages-cancelled"); },
      findFirst: async ({ where }: { where: { order: { userId: string }; status: string } }) => {
        assert.equal(where.status, "DELIVERED");
        return completed || where.order.userId !== "customer" ? null : { id: "package", orderId: "order", vendorId: "vendor", order: { orderNumber: "AGO-RETURN", currency: "BDT", returnWindowUntil: null }, shipments: [{ deliveredAt: new Date(now - 1000) }], items: [{ id: "item", quantity: 3, lineTotalMinor: 900n, returnItems: [{ quantity: 1 }] }] };
      }
    },
    vendorMember: { findMany: async () => [{ userId: "vendor-owner" }] },
    vendorShop: { findFirst: async () => ({ settings: { notificationPreferences: { returnRequest: { push: false } } } }) },
    notification: { upsert: async () => { write("notification"); return { deliveries: [] }; } },
    return: { create: async ({ data }: { data: { requestedMinor: bigint; reasonCode: string; reasonDetail?: string; items: { create: Array<{ orderItemId: string; quantity: number; requestedMinor: bigint }> } } }) => {
      write("return");
      return { ...data, id: "return", orderId: "order", vendorOrderId: "package", status: "REQUESTED", currency: "BDT", approvedMinor: null, reasonDetail: data.reasonDetail ?? null, version: 1, createdAt: new Date(now), items: data.items.create.map((item) => ({ ...item, id: "return-item", inspection: null })) };
    } },
    refund: { create: async ({ data }: { data: { amountMinor: bigint } }) => { assert.equal(data.amountMinor, 500n); write("refund"); } },
    outboxEvent: { create: async () => { write("outbox"); } },
    auditLog: { create: async () => { write("audit"); } }
  };
  const client = { $transaction: async (operation: (value: typeof transaction) => Promise<unknown>, options: { isolationLevel: string }) => {
    assert.equal(options.isolationLevel, "Serializable");
    const result = await operation(transaction);
    if (loseResponse) { loseResponse = false; throw new Error(`${kind} response lost after commit`); }
    return result;
  } } as unknown as PrismaClient;
  return { service: new OperationsService(client), effects };
}

test("lost cancellation response replays after eligibility expires without repeating inventory/refund effects", async (context) => {
  let now = Date.parse("2026-10-03T00:00:00Z");
  context.mock.method(Date, "now", () => now);
  const { service, effects } = replayClient("cancel", now);
  const input = { reason: "Changed mind", expectedVersion: 2 };
  await assert.rejects(() => service.cancelOrder(customer, "order", input, key), /response lost after commit/);
  const committed = [...effects];
  assert.deepEqual(committed, ["inventory-release", "reservation-release", "packages-cancelled", "order", "refund", "outbox", "audit", "idempotency"]);
  now += 31 * 60_000;
  assert.deepEqual(await service.cancelOrder(customer, "order", input, key), { id: "order", status: "CANCELLED", version: 3 });
  assert.deepEqual(effects, committed);
  await assert.rejects(() => service.cancelOrder(customer, "order", { ...input, expectedVersion: 3 }, key), (error: unknown) => error instanceof ApiProblem && error.code === "IDEMPOTENCY_KEY_REUSED");
  await assert.rejects(() => service.cancelOrder({ ...customer, principal: { ...customer.principal, userId: "other" } }, "order", input, key), (error: unknown) => error instanceof ApiProblem && error.code === "ORDER_NOT_FOUND");
  assert.deepEqual(effects, committed);
});

test("lost partial-return response replays without duplicating quantities, audit or outbox", async (context) => {
  let now = Date.now();
  context.mock.method(Date, "now", () => now);
  const { service, effects } = replayClient("return", now);
  const input = { vendorOrderId: "package", reasonCode: "DAMAGED" as const, refundMethod: "ORIGINAL_PAYMENT" as const, items: [{ orderItemId: "item", quantity: 1 }] };
  await assert.rejects(() => service.createReturn(customer, input, key), /response lost after commit/);
  const committed = [...effects];
  assert.deepEqual(committed, ["return", "order", "notification", "outbox", "audit", "idempotency"]);
  now += 8 * 86400000;
  const replay = await service.createReturn(customer, input, key) as { requestedAmount: { amountMinor: string }; items: Array<{ quantity: number }> };
  assert.equal(replay.requestedAmount.amountMinor, "300");
  assert.equal(replay.items[0]?.quantity, 1);
  assert.deepEqual(effects, committed);
  await assert.rejects(() => service.createReturn(customer, { ...input, items: [{ orderItemId: "item", quantity: 2 }] }, key), (error: unknown) => error instanceof ApiProblem && error.code === "IDEMPOTENCY_KEY_REUSED");
  await assert.rejects(() => service.createReturn({ ...customer, principal: { ...customer.principal, userId: "other" } }, input, key), (error: unknown) => error instanceof ApiProblem && error.code === "RETURN_NOT_ELIGIBLE");
  await assert.rejects(() => service.createReturn({ ...customer, status: "SUSPENDED" }, input, key), (error: unknown) => error instanceof ApiProblem && error.status === 403);
  assert.deepEqual(effects, committed);
});
