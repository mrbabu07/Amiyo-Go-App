import assert from "node:assert/strict";
import test from "node:test";
import type { PrismaClient } from "@prisma/client";
import type { Session } from "@amiyo/contracts";
import { OperationsService } from "./operations.service.js";
import { SslCommerzGateway } from "../commerce/sslcommerz.gateway.js";

const admin: Session = { principal: { userId: "22222222-2222-4222-8222-222222222222", roles: ["FINANCE_ADMIN"], vendorIds: [] }, status: "ACTIVE", email: "finance@amiyo.test", phone: null, profile: { firstName: null, lastName: null, displayName: "Finance Admin", avatarStorageKey: null, locale: "en", currency: "BDT" }, permissions: ["finance:manage"], vendorMemberships: [] };
const orderId = "11111111-1111-4111-8111-111111111111";
const refundId = "33333333-3333-4333-8333-333333333333";
const key = "44444444-4444-4444-8444-444444444444";
const input = { expectedVersion: 3, amountMinor: "100000", reason: "Approved customer settlement", providerRefundId: "SSL-REFUND-101" };

function fixture(amountMinor = 100000n, settled = true, providerStatus = "refunded") {
  const vendorDebits: Array<{ amountMinor: bigint; referenceId: string }> = [];
  const financialEntries: Array<{ amountMinor: bigint; accountType: string }> = [];
  const audits: Array<{ action: string }> = [];
  const idempotency: Array<{ scope: string; key: string }> = [];
  let orderUpdates = 0;
  const transaction = {
    platformConfiguration: { findUnique: async () => null },
    idempotencyRecord: { findUnique: async () => null, create: async ({ data }: { data: { scope: string; key: string } }) => { idempotency.push(data); return data; } },
    order: { findUnique: async () => ({ id: orderId, userId: "55555555-5555-4555-8555-555555555555", status: "DELIVERED", version: 3, payments: [{ id: "payment-1", provider: "sslcommerz", attempts: [{ responseSnapshot: { bankTransactionId: "bank-123" } }], method: "SSLCOMMERZ", amountMinor, refundedMinor: 0n, currency: "BDT", status: "CAPTURED", version: 1 }], vendorOrders: [{ id: "package-1", vendorId: "vendor-1", totalMinor: 60000n }, { id: "package-2", vendorId: "vendor-2", totalMinor: 40000n }] }), updateMany: async () => { orderUpdates += 1; return { count: 1 }; } },
    payment: { updateMany: async () => ({ count: 1 }) },
    refund: { findMany: async () => [], create: async () => ({ id: refundId }) },
    vendorWallet: { upsert: async ({ where }: { where: { vendorId: string } }) => ({ id: `wallet-${where.vendorId}`, entries: [] }) },
    vendorLedgerEntry: { findFirst: async () => null, findUnique: async ({ where }: { where: { idempotencyKey: string } }) => settled ? { id: "settlement", walletId: "wallet", direction: "CREDIT", currency: "BDT", amountMinor: where.idempotencyKey.endsWith("package-1") ? 54000n : 36000n, metadata: { vendorId: "vendor", commissionMinor: where.idempotencyKey.endsWith("package-1") ? "6000" : "4000" } } : null, create: async ({ data }: { data: { amountMinor: bigint; referenceId: string } }) => { vendorDebits.push(data); return data; } },
    financialLedgerEntry: { findUnique: async () => null, aggregate: async () => ({ _sum: { amountMinor: 0n } }), create: async ({ data }: { data: { amountMinor: bigint; accountType: string } }) => { financialEntries.push(data); return data; } },
    loyaltyAccount: { findUnique: async () => null },
    orderStatusEvent: { create: async ({ data }: { data: unknown }) => data },
    outboxEvent: { create: async ({ data }: { data: unknown }) => data },
    auditLog: { create: async ({ data }: { data: { action: string } }) => { audits.push(data); return data; } }
  };
  const client = { $transaction: async (operation: (client: typeof transaction) => unknown) => operation(transaction) } as unknown as PrismaClient;
  const gateway = new SslCommerzGateway(async () => new Response(JSON.stringify({ APIConnect: "DONE", status: providerStatus, refund_ref_id: input.providerRefundId, bank_tran_id: "bank-123" })), { SSLCOMMERZ_STORE_ID: "test", SSLCOMMERZ_STORE_PASSWORD: "test" });
  return { service: new OperationsService(client, gateway), vendorDebits, financialEntries, audits, idempotency, get orderUpdates() { return orderUpdates; } };
}

test("forced admin refund balances seller and finance ledgers", async () => {
  const state = fixture();
  const result = await state.service.forceOrderRefund(admin, orderId, input, key) as unknown as { status: string };
  assert.equal(result.status, "REFUNDED");
  assert.deepEqual(state.vendorDebits.map((entry) => entry.amountMinor), [54000n, 36000n]);
  assert.equal(state.vendorDebits.reduce((sum, entry) => sum + entry.amountMinor, 0n), 90000n);
  assert.equal(state.financialEntries.find((entry) => entry.accountType === "customer_refund")?.amountMinor, 100000n);
  assert.equal(state.financialEntries.filter((entry) => entry.accountType === "platform_commission").reduce((total, entry) => total + entry.amountMinor, 0n), 10000n);
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

test("refund before settlement records allocation without creating seller wallet debt", async () => {
  const state = fixture(100000n, false);
  await state.service.forceOrderRefund(admin, orderId, input, key);
  assert.equal(state.vendorDebits.length, 0);
  assert.equal(state.financialEntries.filter((entry) => entry.accountType === "vendor_refund_allocation").length, 2);
});

test("pending provider evidence never changes order, wallet or refund ledgers", async () => {
  const state = fixture(100000n, true, "processing");
  await assert.rejects(state.service.forceOrderRefund(admin, orderId, input, key), /not confirmed refunded/);
  assert.equal(state.orderUpdates, 0);
  assert.equal(state.vendorDebits.length, 0);
  assert.equal(state.financialEntries.length, 0);
});
