import assert from "node:assert/strict";
import test from "node:test";
import type { PrismaClient } from "@prisma/client";
import type { Session } from "@amiyo/contracts";
import { OperationsService } from "./operations.service.js";

const session: Session = { principal: { userId: "22222222-2222-4222-8222-222222222222", roles: ["OPERATIONS_ADMIN"], vendorIds: [] }, status: "ACTIVE", email: "operator@amiyo.test", phone: null, profile: { firstName: null, lastName: null, displayName: "Operator", avatarStorageKey: null, locale: "en", currency: "BDT" }, permissions: ["returns:manage", "finance:read"], vendorMemberships: [] };

test("admin return detail exposes order, seller, item and timeline context", async () => {
  const now = new Date("2026-08-14T12:00:00Z");
  const client = { return: { findUnique: async () => ({ id: "11111111-1111-4111-8111-111111111111", orderId: "33333333-3333-4333-8333-333333333333", vendorOrderId: "44444444-4444-4444-8444-444444444444", status: "REVIEWING", reasonCode: "DAMAGED", reasonDetail: "Box was crushed", requestedMinor: 25000n, approvedMinor: null, currency: "BDT", version: 2, createdAt: now, items: [{ id: "55555555-5555-4555-8555-555555555555", orderItemId: "66666666-6666-4666-8666-666666666666", quantity: 1, requestedMinor: 25000n, inspection: null, orderItem: { productNameSnapshot: "Demo product", skuSnapshot: "DEMO-1", unitPriceMinor: 25000n, lineTotalMinor: 25000n } }], order: { orderNumber: "AGO-1001", user: { normalizedEmail: "buyer@amiyo.test", normalizedPhone: null, profile: { displayName: "Demo Buyer" } } }, vendorOrder: { vendor: { displayName: "Demo Vendor", legalName: "Demo Vendor Ltd" }, shop: { name: "Demo Shop" } }, events: [{ id: "77777777-7777-4777-8777-777777777777", fromStatus: "REQUESTED", toStatus: "REVIEWING", actorType: "admin", note: "Review started", createdAt: now }], refunds: [] }) } } as unknown as PrismaClient;
  const detail = await new OperationsService(client).returnDetail(session, "11111111-1111-4111-8111-111111111111");
  assert.equal(detail.orderNumber, "AGO-1001");
  assert.equal(detail.vendor.shop, "Demo Shop");
  assert.equal(detail.items[0]?.name, "Demo product");
  assert.equal(detail.events[0]?.toStatus, "REVIEWING");
});

test("admin return detail rejects customer sessions", async () => {
  const customer = { ...session, principal: { ...session.principal, roles: ["CUSTOMER" as const] }, permissions: [] };
  await assert.rejects(() => new OperationsService({} as PrismaClient).returnDetail(customer, "11111111-1111-4111-8111-111111111111"), /cannot perform this operation/);
});
