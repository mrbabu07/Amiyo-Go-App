import assert from "node:assert/strict";
import test from "node:test";
import type { Session } from "@amiyo/contracts";
import { OperationsService } from "./operations.service.js";
import { ApiProblem } from "../../middleware/api-problem.js";
import { returnProductSelect } from "./return-product.js";

const session = { status: "ACTIVE", principal: { userId: "customer", roles: ["CUSTOMER"], vendorIds: ["vendor"] }, permissions: ["returns:manage", "orders:read"], vendorMemberships: [], phone: null, email: null, profile: { firstName: null, lastName: null, displayName: null, avatarStorageKey: null, locale: "en", currency: "BDT" } } satisfies Session;

test("customer and vendor return detail queries enforce ownership without list pagination", async () => {
  for (const vendor of [false, true]) {
    const service = new OperationsService({ return: { findFirst: async (query: { where: unknown; include: unknown }) => {
      assert.deepEqual(query, { where: { id: "old-return", ...(vendor ? { vendorOrder: { vendorId: "vendor" } } : { userId: "customer" }) }, include: { items: { include: { orderItem: { select: returnProductSelect } } }, events: { select: { id: true, fromStatus: true, toStatus: true, createdAt: true }, orderBy: [{ createdAt: "asc" }, { id: "asc" }] } } });
      return { id: "old-return", orderId: "order", vendorOrderId: "package", status: "REJECTED", reasonCode: "DAMAGED", reasonDetail: null, requestedMinor: 123n, approvedMinor: null, currency: "BDT", version: 1, createdAt: new Date("2020-01-01"), items: [{ id: "line", orderItemId: "purchased", quantity: 2, requestedMinor: 123n, inspection: null, orderItem: { productNameSnapshot: "Purchased product", skuSnapshot: "SKU", attributesSnapshot: { size: "M" }, product: { media: [{ storageKey: "https://example.test/photo.jpg" }] } } }], refundMethod: "MANUAL", events: [
        { id: "requested", fromStatus: null, toStatus: "REQUESTED", createdAt: new Date("2020-01-01"), metadata: { evidenceStorageKeys: ["private"] }, actorId: "secret-actor", note: "internal" },
        { id: "rejected", fromStatus: "REQUESTED", toStatus: "REJECTED", createdAt: new Date("2020-01-02"), note: "internal fraud assessment" }
      ] };
    } } } as never);
    const result = await service.ownReturn(session, "old-return", vendor);
    assert.equal(result.id, "old-return");
    assert.equal(result.requestedAmount.amountMinor, "123");
    assert.equal(result.refundMethod, "MANUAL");
    assert.deepEqual(result.items[0], { id: "line", orderItemId: "purchased", quantity: 2, requestedAmount: { amountMinor: "123", currency: "BDT" }, inspection: null, productName: "Purchased product", sku: "SKU", attributes: { size: "M" }, thumbnailUrl: "https://example.test/photo.jpg" });
    assert.deepEqual(result.events, [
      { id: "requested", fromStatus: null, toStatus: "REQUESTED", createdAt: "2020-01-01T00:00:00.000Z" },
      { id: "rejected", fromStatus: "REQUESTED", toStatus: "REJECTED", createdAt: "2020-01-02T00:00:00.000Z" }
    ]);
  }
});

test("missing or unowned return returns 404 without exposing existence", async () => {
  const service = new OperationsService({ return: { findFirst: async () => null } } as never);
  await assert.rejects(() => service.ownReturn(session, "other"), (error: unknown) => error instanceof ApiProblem && error.status === 404);
});

test("customer return list exposes recorded milestones but not internal event metadata", async () => {
  const service = new OperationsService({ return: { findMany: async (query: any) => {
    assert.deepEqual(query.where, { userId: "customer" });
    assert.equal(query.take, 100);
    assert.deepEqual(query.include.events.select, { id: true, fromStatus: true, toStatus: true, createdAt: true });
    assert.deepEqual(query.include.events.orderBy, [{ createdAt: "asc" }, { id: "asc" }]);
    return [{ id: "return", orderId: "order", vendorOrderId: "package", status: "REQUESTED", reasonCode: "DAMAGED", reasonDetail: null, requestedMinor: 123n, approvedMinor: null, currency: "BDT", version: 1, createdAt: new Date("2026-10-08"), items: [], refundMethod: "MANUAL", events: [{ id: "event", fromStatus: null, toStatus: "REQUESTED", createdAt: new Date("2026-10-08"), actorId: "private", note: "internal", metadata: { evidenceStorageKeys: ["secret"] } }] }];
  } } } as never);
  const result = await service.returns(session);
  assert.deepEqual(result[0]?.events, [{ id: "event", fromStatus: null, toStatus: "REQUESTED", createdAt: "2026-10-08T00:00:00.000Z" }]);
  assert.equal(result[0]?.refundMethod, "MANUAL");
});

test("inactive, unauthorized and non-vendor sessions fail before querying returns", async () => {
  const service = new OperationsService({} as never);
  for (const vendor of [true, false]) {
    await assert.rejects(() => service.ownReturn({ ...session, status: "SUSPENDED" }, "return", vendor), (error: unknown) => error instanceof ApiProblem && error.status === 403);
    await assert.rejects(() => service.ownReturn({ ...session, permissions: [] }, "return", vendor), (error: unknown) => error instanceof ApiProblem && error.status === 403);
  }
  await assert.rejects(() => service.ownReturn({ ...session, principal: { ...session.principal, vendorIds: [] } }, "return", true), (error: unknown) => error instanceof ApiProblem && error.status === 403);
});
