import assert from "node:assert/strict";
import test from "node:test";
import type { PrismaClient } from "@prisma/client";
import type { Session } from "@amiyo/contracts";
import { OperationsService } from "./operations.service.js";

const userId = "11111111-1111-4111-8111-111111111111";
const dispatchId = "22222222-2222-4222-8222-222222222222";
const eventId = "33333333-3333-4333-8333-333333333333";
const session: Session = { principal: { userId, roles: ["OPERATIONS_ADMIN"], vendorIds: [] }, status: "ACTIVE", email: null, phone: null, profile: { firstName: null, lastName: null, displayName: "Operator", avatarStorageKey: null, locale: "en", currency: "BDT" }, permissions: ["admin:read", "admin:manage"], vendorMemberships: [] };

test("operations admin requeues only the existing durable delivery event", async () => {
  const calls: string[] = [];
  const transaction = {
    idempotencyRecord: { findUnique: async () => null, create: async () => { calls.push("idempotency"); } },
    deliveryDispatch: {
      findUnique: async () => ({ id: dispatchId, status: "FAILED", externalOrderId: null }),
      updateMany: async () => { calls.push("dispatch"); return { count: 1 }; }
    },
    outboxEvent: {
      findFirst: async () => ({ id: eventId }),
      update: async () => { calls.push("outbox"); }
    },
    auditLog: { create: async () => { calls.push("audit"); } }
  };
  const client = { $transaction: async (operation: (value: unknown) => unknown) => operation(transaction) } as unknown as PrismaClient;
  const result = await new OperationsService(client).retryDelivery(session, dispatchId, { reason: "Provider outage resolved" }, "44444444-4444-4444-8444-444444444444", "correlation-1");
  assert.deepEqual(result, { id: dispatchId, status: "PENDING", queued: true });
  assert.deepEqual(calls, ["dispatch", "outbox", "audit", "idempotency"]);
});

test("delivery retry rejects users without operations permission", async () => {
  const client = {} as PrismaClient;
  await assert.rejects(() => new OperationsService(client).retryDelivery({ ...session, permissions: ["admin:read"] }, dispatchId, { reason: "Retry request" }, "55555555-5555-4555-8555-555555555555"), /cannot perform this operation/);
});

test("finance admin cannot operate the delivery retry queue", async () => {
  const financeSession = { ...session, principal: { ...session.principal, roles: ["FINANCE_ADMIN" as const] }, permissions: ["admin:read", "admin:manage"] };
  await assert.rejects(() => new OperationsService({} as PrismaClient).retryDelivery(financeSession, dispatchId, { reason: "Retry request" }, "66666666-6666-4666-8666-666666666666"), /Operations access is required/);
});
