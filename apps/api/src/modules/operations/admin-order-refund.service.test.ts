import assert from "node:assert/strict";
import test from "node:test";
import type { PrismaClient } from "@prisma/client";
import type { Session } from "@amiyo/contracts";
import { OperationsService } from "./operations.service.js";

const admin: Session = { principal: { userId: "22222222-2222-4222-8222-222222222222", roles: ["FINANCE_ADMIN"], vendorIds: [] }, status: "ACTIVE", email: "finance@amiyo.test", phone: null, profile: { firstName: null, lastName: null, displayName: "Finance Admin", avatarStorageKey: null, locale: "en", currency: "BDT" }, permissions: ["finance:manage"], vendorMemberships: [] };
const orderId = "11111111-1111-4111-8111-111111111111";
const refundId = "33333333-3333-4333-8333-333333333333";
const key = "44444444-4444-4444-8444-444444444444";
const input = { expectedVersion: 3, amountMinor: "100000", reason: "Approved customer settlement", providerRefundId: "SSL-REFUND-101" };

function fixture(amountMinor = 100000n) {
  const vendorDebits: Array<{ amountMinor: bigint; referenceId: string }> = [];
  const financialEntries: Array<{ amountMinor: bigint }> = [];
  const audits: Array<{ action: string }> = [];
  const idempotency: Array<{ scope: string; key: string }> = [];
  let orderUpdates = 0;
  const transaction = {
    idempotencyRecord: { findUnique: async () => null, create: async ({ data }: { data: { scope: string; key: string } }) => { idempotency.push(data); return data; } },
    order: { findUnique: async () => ({ id: orderId, userId: "55555555-5555-4555-8555-555555555555", status: "DELIVERED", version: 3, payments: [{ id: "payment-1", provider: "sslcommerz", method: "SSLCOMMERZ", amountMinor, refundedMinor: 0n, currency: "BDT", status: "CAPTURED", version: 1 }], vendorOrders: [{ vendorId: "vendor-1", totalMinor: 60000n }, { vendorId: "vendor-2", totalMinor: 40000n }] }), updateMany: async () => { orderUpdates += 1; return { count: 1 }; } },
    payment: { updateMany: async () => ({ count: 1 }) },
    refund: { create: async () => ({ id: refundId }) },
    vendorWallet: { upsert: async ({ where }: { where: { vendorId: string } }) => ({ id: `wallet-${where.vendorId}`, entries: [] }) },
    vendorLedgerEntry: { create: async ({ data }: { data: { amountMinor: bigint; referenceId: string } }) => { vendorDebits.push(data); return data; } },
    financialLedgerEntry: { create: async ({ data }: { data: { amountMinor: bigint } }) => { financialEntries.push(data); return data; } },
    orderStatusEvent: { create: async ({ data }: { data: unknown }) => data },
    outboxEvent: { create: async ({ data }: { data: unknown }) => data },
    auditLog: { create: async ({ data }: { data: { action: string } }) => { audits.push(data); return data; } }
  };
  const client = { $transaction: async (operation: (client: typeof transaction) => unknown) => operation(transaction) } as unknown as PrismaClient;
  return { service: new OperationsService(client), vendorDebits, financialEntries, audits, idempotency, get orderUpdates() { return orderUpdates; } };
}

test("forced admin refund balances seller and finance ledgers", async () => {
  const state = fixture();
  const result = await state.service.forceOrderRefund(admin, orderId, input, key) as unknown as { status: string };
  assert.equal(result.status, "REFUNDED");
  assert.deepEqual(state.vendorDebits.map((entry) => entry.amountMinor), [60000n, 40000n]);
  assert.equal(state.vendorDebits.reduce((sum, entry) => sum + entry.amountMinor, 0n), 100000n);
  assert.equal(state.financialEntries[0]?.amountMinor, 100000n);
  assert.equal(state.audits[0]?.action, "order.refund_forced");
  assert.equal(state.idempotency[0]?.scope, `order-refund:${orderId}`);
  assert.equal(state.idempotency[0]?.key, key);
});

test("forced admin refund rejects amounts above captured payment before mutation", async () => {
  const state = fixture(50000n);
  await assert.rejects(() => state.service.forceOrderRefund(admin, orderId, input, key), /refund exceeds captured payment/i);
  assert.equal(state.orderUpdates, 0);
  assert.equal(state.vendorDebits.length, 0);
});
