import assert from "node:assert/strict";
import test from "node:test";
import type { Session } from "@amiyo/contracts";
import { OrderService } from "./order.service.js";

const seller = { status: "ACTIVE", permissions: ["orders:manage"], principal: { userId: "seller-user", roles: ["VENDOR_OWNER"], vendorIds: ["vendor-a"] } } as Session;

test("seller package rejection reserves its exact captured-payment refund share", async () => {
  let refund: { vendorOrderId?: string; amountMinor?: bigint; reason?: string } | null = null;
  const payment = { id: "payment", provider: "manual", providerTransactionId: "paid", method: "MANUAL", status: "CAPTURED", amountMinor: 950n, refundedMinor: 0n, currency: "BDT", version: 1, createdAt: new Date("2026-10-28") };
  const current = { id: "package-a", orderId: "order", vendorId: "vendor-a", shopId: "shop", status: "PLACED", subtotalMinor: 700n, discountMinor: 0n, deliveryMinor: 0n, totalMinor: 700n, commissionMinor: 0n, version: 2, createdAt: new Date("2026-10-28"), updatedAt: new Date("2026-10-28"), order: { status: "CONFIRMED", version: 1, orderNumber: "AGO-1", currency: "BDT", userId: null, user: null, addresses: [], payments: [payment], reservations: [], vendorOrders: [{ id: "package-a", totalMinor: 700n }, { id: "package-b", totalMinor: 300n }], fulfillmentMethod: "DELIVERY", pickupPointSnapshot: null, openBoxAllowed: false, inspectionMinutes: 0 }, shop: { name: "Shop A" }, items: [], shipments: [], dispatches: [] };
  const transaction = {
    vendorOrder: { findUnique: async () => current, update: async () => ({}), findUniqueOrThrow: async () => ({ ...current, status: "REJECTED", version: 3 }) },
    idempotencyRecord: { findUnique: async () => null, create: async ({ data }: any) => data },
    platformConfiguration: { findUnique: async () => null },
    refund: { aggregate: async () => ({ _sum: { amountMinor: 0n } }), create: async ({ data }: any) => { refund = data; return data; } },
    order: { findUniqueOrThrow: async () => ({ id: "order", status: "CONFIRMED", version: 1, userId: null, vendorOrders: [{ status: "REJECTED" }, { status: "PLACED" }] }), update: async ({ data }: any) => ({ status: "CANCELLED", version: 2, ...data }) },
    orderStatusEvent: { create: async ({ data }: any) => data }, outboxEvent: { create: async ({ data }: any) => data }, auditLog: { create: async ({ data }: any) => data }
  };
  const service = new OrderService({ $transaction: async (work: (value: unknown) => unknown) => work(transaction) } as never);
  const result = await service.transitionVendorOrder(seller, "package-a", { status: "REJECTED", expectedVersion: 2, reason: "Stock unavailable" }, "key") as { status: string };
  assert.equal(result.status, "REJECTED");
  const recorded = refund as { vendorOrderId: string; amountMinor: bigint; reason: string } | null;
  assert.deepEqual(recorded && { vendorOrderId: recorded.vendorOrderId, amountMinor: recorded.amountMinor, reason: recorded.reason }, { vendorOrderId: "package-a", amountMinor: 665n, reason: "Seller package rejected: Stock unavailable" });
});
