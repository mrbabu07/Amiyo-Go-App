import assert from "node:assert/strict";
import test from "node:test";
import type { Session } from "@amiyo/contracts";
import { AdminService } from "./admin.service.js";

const orderId = "11111111-1111-4111-8111-111111111111";
const admin: Session = { principal: { userId: "22222222-2222-4222-8222-222222222222", roles: ["SUPER_ADMIN"], vendorIds: [] }, status: "ACTIVE", email: "admin@example.com", phone: null, profile: { firstName: "Admin", lastName: null, displayName: "Admin", avatarStorageKey: null, locale: "en", currency: "BDT" }, permissions: ["admin:read", "admin:manage"], vendorMemberships: [] };

test("admin order detail includes printable customer, payment and fulfillment data", async () => {
  const client = { order: { findUnique: async () => ({ id: orderId, orderNumber: "AGO-100", status: "CONFIRMED", version: 1, createdAt: new Date("2026-08-14T00:00:00.000Z"), placedAt: new Date("2026-08-14T00:00:00.000Z"), userId: "33333333-3333-4333-8333-333333333333", user: { normalizedEmail: "customer@example.com", normalizedPhone: "01700000000", profile: { displayName: "Customer" } }, addresses: [{ type: "delivery", recipientName: "Customer", phone: "01700000000", line1: "Road 1", line2: null, division: "Dhaka", district: "Dhaka", upazila: null, unionName: null, postalCode: "1200" }], payments: [{ id: "44444444-4444-4444-8444-444444444444", provider: "cod", method: "COD", status: "AUTHORIZED", amountMinor: 10600n, refundedMinor: 0n, currency: "BDT", providerTransactionId: null, createdAt: new Date("2026-08-14T00:00:00.000Z") }], invoice: { id: "55555555-5555-4555-8555-555555555555", number: "INV-AGO-100", issuedAt: new Date("2026-08-14T00:00:00.000Z"), storageKey: null }, statusEvents: [{ id: "66666666-6666-4666-8666-666666666666", fromStatus: null, toStatus: "CONFIRMED", actorType: "customer", reason: null, createdAt: new Date("2026-08-14T00:00:00.000Z") }], subtotalMinor: 10000n, discountMinor: 0n, deliveryMinor: 600n, taxMinor: 0n, totalMinor: 10600n, currency: "BDT", vendorOrders: [{ id: "77777777-7777-4777-8777-777777777777", vendorId: "88888888-8888-4888-8888-888888888888", vendor: { displayName: "Vendor" }, shop: { name: "Shop" }, status: "PLACED", version: 1, subtotalMinor: 10000n, discountMinor: 0n, deliveryMinor: 600n, totalMinor: 10600n, commissionMinor: 500n, shipments: [], items: [{ id: "99999999-9999-4999-8999-999999999999", productNameSnapshot: "Product", skuSnapshot: "SKU-1", quantity: 1, unitPriceMinor: 10000n, lineTotalMinor: 10000n, currency: "BDT" }] }] }) } };
  const result = await new AdminService(client as never).orderDetail(admin, orderId);
  assert.equal(result.customer.displayName, "Customer");
  assert.equal(result.invoice?.number, "INV-AGO-100");
  assert.equal(result.vendorOrders[0]?.commission.amountMinor, "500");
  assert.equal(result.deliveryAddress?.district, "Dhaka");
});
