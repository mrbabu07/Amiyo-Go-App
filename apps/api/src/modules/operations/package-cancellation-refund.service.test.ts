import assert from "node:assert/strict";
import test from "node:test";
import type { PrismaClient } from "@prisma/client";
import type { Session } from "@amiyo/contracts";
import { OperationsService } from "./operations.service.js";

const admin: Session = { principal: { userId: "22222222-2222-4222-8222-222222222222", roles: ["FINANCE_ADMIN"], vendorIds: [] }, status: "ACTIVE", email: "finance@amiyo.test", phone: null, profile: { firstName: null, lastName: null, displayName: "Finance Admin", avatarStorageKey: null, locale: "en", currency: "BDT" }, permissions: ["finance:manage"], vendorMemberships: [] };
const refundId = "11111111-1111-4111-8111-111111111111";
const orderId = "22222222-2222-4222-8222-222222222223";
const vendorOrderId = "33333333-3333-4333-8333-333333333333";
const paymentId = "44444444-4444-4444-8444-444444444444";
const key = "55555555-5555-4555-8555-555555555555";

function fixture() {
  const financial: Array<{ accountType: string; amountMinor: bigint }> = [];
  const audits: string[] = [];
  let paymentUpdate: unknown;
  let refundUpdate: unknown;
  const row = { id: refundId, orderId, paymentId, returnId: null, vendorOrderId, amountMinor: 400n, currency: "BDT", status: "pending", reason: "Seller package rejected: stock unavailable", createdAt: new Date("2026-10-28T00:00:00.000Z"), order: { id: orderId, orderNumber: "AGO-1", userId: "customer", status: "PROCESSING" }, payment: { id: paymentId, provider: "manual", method: "MANUAL", status: "CAPTURED", amountMinor: 1000n, refundedMinor: 100n, currency: "BDT", version: 2, attempts: [] }, vendorOrder: { id: vendorOrderId, totalMinor: 500n, shop: { name: "Village Shop" }, vendor: { displayName: "Village Seller" } } };
  const transaction = {
    platformConfiguration: { findUnique: async () => null },
    idempotencyRecord: { findUnique: async () => null, create: async ({ data }: any) => data },
    refund: { findMany: async () => [], findUnique: async () => row, update: async ({ data }: any) => { refundUpdate = data; return { ...row, ...data }; } },
    payment: { updateMany: async ({ data }: any) => { paymentUpdate = data; return { count: 1 }; } },
    vendorLedgerEntry: { findUnique: async () => null, findFirst: async () => null },
    financialLedgerEntry: { findUnique: async () => null, aggregate: async () => ({ _sum: { amountMinor: 0n } }), create: async ({ data }: any) => { financial.push(data); return data; } },
    loyaltyAccount: { findUnique: async () => null },
    order: { findUnique: async () => ({ userId: "customer" }), update: async ({ data }: any) => data }, orderStatusEvent: { create: async ({ data }: any) => data },
    outboxEvent: { create: async ({ data }: any) => data }, auditLog: { create: async ({ data }: any) => { audits.push(data.action); return data; } }
  };
  const client = { $transaction: async (work: (value: unknown) => unknown) => work(transaction), refund: { findMany: async () => [row] } } as unknown as PrismaClient;
  return { service: new OperationsService(client), financial, audits, get paymentUpdate() { return paymentUpdate; }, get refundUpdate() { return refundUpdate; } };
}

test("finance queue exposes only package-linked pending refunds", async () => {
  const state = fixture();
  const rows = await state.service.packageCancellationRefunds(admin);
  assert.deepEqual(rows.map((row) => ({ id: row.refundId, packageId: row.vendorOrderId, shop: row.shopName, amount: row.amount.amountMinor })), [{ id: refundId, packageId: vendorOrderId, shop: "Village Shop", amount: "400" }]);
});

test("package cancellation completion posts exact payment and accounting evidence once", async () => {
  const state = fixture();
  const result = await state.service.completePackageCancellationRefund(admin, refundId, { providerRefundId: null }, key) as { status: string; refundedTotal: { amountMinor: string } };
  assert.equal(result.status, "completed");
  assert.equal(result.refundedTotal.amountMinor, "500");
  assert.deepEqual(state.paymentUpdate, { refundedMinor: 500n, status: "PARTIALLY_REFUNDED", version: { increment: 1 } });
  assert.match(JSON.stringify(state.refundUpdate), /completed/);
  assert.equal(state.financial.find((entry) => entry.accountType === "vendor_refund_allocation")?.amountMinor, 400n);
  assert.equal(state.financial.find((entry) => entry.accountType === "customer_refund")?.amountMinor, 400n);
  assert.deepEqual(state.audits, ["package_cancellation.refund.completed"]);
});
