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

test("parcel document uses seller total instead of multi-store parent total", async () => {
  const client = { vendorOrder: { findUnique: async () => packageRow() } };
  const result = await new OrderService(client as never).fulfillmentDocument(session, "package-123456");
  assert.equal(result.payment.collectAmount.amountMinor, "1200");
  assert.equal(result.total.amountMinor, "1200");
  const verified = verifyDocumentQrPayload(result.qrPayload);
  assert.ok(verified.valid && verified.claims.type === "parcel");
  assert.equal(verified.claims.amountMinor, "1200");
  assert.equal(verified.claims.quantity, 2);
});

test("paid COD document cannot ask courier to collect twice", async () => {
  const client = { vendorOrder: { findUnique: async () => packageRow("CAPTURED") } };
  const result = await new OrderService(client as never).fulfillmentDocument(session, "package-123456");
  assert.equal(result.payment.collectAmount.amountMinor, "0");
});

test("seller cannot read another seller parcel document", async () => {
  const client = { vendorOrder: { findUnique: async () => ({ ...packageRow(), vendorId: "other-vendor" }) } };
  await assert.rejects(new OrderService(client as never).fulfillmentDocument(session, "package-123456"), /cannot access/i);
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
