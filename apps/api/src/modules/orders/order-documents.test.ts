import assert from "node:assert/strict";
import test from "node:test";
import type { Session } from "@amiyo/contracts";
import { OrderService } from "./order.service.js";
import { AdminService } from "../admin/admin.service.js";
import { verifyDocumentQrPayload } from "./document-qr.js";

const session = { status: "ACTIVE", permissions: ["orders:read"], principal: { userId: "customer", roles: ["VENDOR_OWNER"], vendorIds: ["vendor"] } } as Session;
function packageRow(paymentStatus = "AUTHORIZED") {
  return { id: "package-123456", vendorId: "vendor", orderId: "parent", status: "READY_TO_SHIP", createdAt: new Date(), totalMinor: 1200n, subtotalMinor: 1000n, deliveryMinor: 200n, discountMinor: 0n, shop: { name: "Shop", settings: {} }, shipments: [], items: [{ id: "item", productNameSnapshot: "Item", skuSnapshot: "SKU", quantity: 2, unitPriceMinor: 500n, lineTotalMinor: 1000n, currency: "BDT" }], order: { orderNumber: "ORDER", currency: "BDT", totalMinor: 9000n, addresses: [{ type: "delivery", recipientName: "Buyer", phone: "01700000000", line1: "Village", district: "Dhaka", division: "Dhaka" }], payments: [{ method: "COD", status: paymentStatus }] } };
}

function documentClient(paymentStatus = "AUTHORIZED") {
  const row = packageRow(paymentStatus);
  return {
    vendorOrder: { findUnique: async () => row },
    orderAddress: { findUnique: async () => row.order.addresses[0] },
    payment: { findFirst: async () => row.order.payments[0] },
    orderItem: { findMany: async () => row.items },
    shipment: { findUnique: async () => row.shipments[0] ?? null }
  };
}

test("parcel document uses seller total instead of multi-store parent total", async () => {
  const client = documentClient();
  const result = await new OrderService(client as never).fulfillmentDocument(session, "package-123456");
  assert.equal(result.payment.collectAmount.amountMinor, "1200");
  assert.equal(result.total.amountMinor, "1200");
  const verified = verifyDocumentQrPayload(result.qrPayload);
  assert.ok(verified.valid && verified.claims.type === "parcel");
  assert.equal(verified.claims.amountMinor, "1200");
  assert.equal(verified.claims.quantity, 2);
});

test("paid COD document cannot ask courier to collect twice", async () => {
  const client = documentClient("CAPTURED");
  const result = await new OrderService(client as never).fulfillmentDocument(session, "package-123456");
  assert.equal(result.payment.collectAmount.amountMinor, "0");
});

test("seller cannot read another seller parcel document", async () => {
  const client = { vendorOrder: { findUnique: async () => ({ ...packageRow(), vendorId: "other-vendor" }) } };
  await assert.rejects(new OrderService(client as never).fulfillmentDocument(session, "package-123456"), /cannot access/i);
});

test("parcel document starts independent relation reads concurrently after ownership", async () => {
  const row = packageRow();
  let started = 0;
  let release: (() => void) | undefined;
  const barrier = new Promise<void>((resolve) => { release = resolve; });
  const branch = async (value: unknown) => {
    started++;
    if (started === 4) release?.();
    await barrier;
    return value;
  };
  const client = {
    vendorOrder: { findUnique: async () => row },
    orderAddress: { findUnique: async () => branch(row.order.addresses[0]) },
    payment: { findFirst: async () => branch(row.order.payments[0]) },
    orderItem: { findMany: async () => branch(row.items) },
    shipment: { findUnique: async () => branch(null) }
  };
  const result = await new OrderService(client as never).fulfillmentDocument(session, row.id);
  assert.equal(started, 4);
  assert.equal(result.vendorOrderId, row.id);
});

test("invoice creation is denied before database access for non-admins", async () => {
  await assert.rejects(new AdminService({} as never).issueOrderInvoice(session, "parent"), /admin:manage/);
});

test("admin invoice issuance retains invoice identity and records audit atomically", async () => {
  const calls: string[] = [];
  const transaction = {
    order: { findUnique: async () => ({ orderNumber: "ORDER" }) },
    invoice: { upsert: async (input: { update: object; where: { orderId: string } }) => {
      assert.deepEqual(input.update, {});
      assert.equal(input.where.orderId, "parent");
      calls.push("invoice");
      return { id: "invoice", number: "INV-ORDER" };
    } },
    auditLog: { create: async () => { calls.push("audit"); } }
  };
  const service = new AdminService({ $transaction: async (callback: (value: typeof transaction) => Promise<void>) => callback(transaction) } as never);
  service.orderDetail = async () => ({ invoice: { id: "invoice" } } as never);
  await service.issueOrderInvoice({ ...session, permissions: ["admin:manage", "admin:read"] }, "parent");
  assert.deepEqual(calls, ["invoice", "audit"]);
});
