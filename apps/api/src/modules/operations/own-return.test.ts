import assert from "node:assert/strict";
import test from "node:test";
import type { Session } from "@amiyo/contracts";
import { OperationsService } from "./operations.service.js";
import { ApiProblem } from "../../middleware/api-problem.js";

const session = { status: "ACTIVE", principal: { userId: "customer", roles: ["CUSTOMER"], vendorIds: ["vendor"] }, permissions: ["returns:manage", "orders:read"], vendorMemberships: [], phone: null, email: null, profile: { firstName: null, lastName: null, displayName: null, avatarStorageKey: null, locale: "en", currency: "BDT" } } satisfies Session;

test("customer and vendor return detail queries enforce ownership without list pagination", async () => {
  for (const vendor of [false, true]) {
    const service = new OperationsService({ return: { findFirst: async (query: { where: unknown; include: unknown }) => {
      assert.deepEqual(query, { where: { id: "old-return", ...(vendor ? { vendorOrder: { vendorId: "vendor" } } : { userId: "customer" }) }, include: { items: true } });
      return { id: "old-return", orderId: "order", vendorOrderId: "package", status: "REQUESTED", reasonCode: "DAMAGED", reasonDetail: null, requestedMinor: 123n, approvedMinor: null, currency: "BDT", version: 1, createdAt: new Date("2020-01-01"), items: [] };
    } } } as never);
    const result = await service.ownReturn(session, "old-return", vendor);
    assert.equal(result.id, "old-return");
    assert.equal(result.requestedAmount.amountMinor, "123");
  }
});

test("missing or unowned return returns 404 without exposing existence", async () => {
  const service = new OperationsService({ return: { findFirst: async () => null } } as never);
  await assert.rejects(() => service.ownReturn(session, "other"), (error: unknown) => error instanceof ApiProblem && error.status === 404);
});

test("inactive, unauthorized and non-vendor sessions fail before querying returns", async () => {
  const service = new OperationsService({} as never);
  for (const vendor of [true, false]) {
    await assert.rejects(() => service.ownReturn({ ...session, status: "SUSPENDED" }, "return", vendor), (error: unknown) => error instanceof ApiProblem && error.status === 403);
    await assert.rejects(() => service.ownReturn({ ...session, permissions: [] }, "return", vendor), (error: unknown) => error instanceof ApiProblem && error.status === 403);
  }
  await assert.rejects(() => service.ownReturn({ ...session, principal: { ...session.principal, vendorIds: [] } }, "return", true), (error: unknown) => error instanceof ApiProblem && error.status === 403);
});
