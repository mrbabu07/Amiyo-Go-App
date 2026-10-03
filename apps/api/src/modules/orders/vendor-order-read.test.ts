import assert from "node:assert/strict";
import test from "node:test";
import type { Session } from "@amiyo/contracts";
import { ApiProblem } from "../../middleware/api-problem.js";
import { OrderService } from "./order.service.js";

const seller = { status: "ACTIVE", permissions: ["orders:read"], principal: { userId: "user", roles: ["VENDOR_OWNER"], vendorIds: ["vendor"] } } as Session;

test("unauthorized order and document readers are denied before database access", async () => {
  const service = new OrderService({} as never);
  const sessions: Session[] = [
    { ...seller, status: "SUSPENDED" },
    { ...seller, permissions: [] },
    { ...seller, principal: { ...seller.principal, roles: ["CUSTOMER"], vendorIds: [] } }
  ];
  for (const session of sessions) {
    for (const operation of [() => service.vendorOrder(session, "package"), () => service.fulfillmentDocument(session, "package")]) {
      await assert.rejects(operation, (error: unknown) => error instanceof ApiProblem && error.status === 403);
    }
  }
});

test("vendor list keeps scope, status and limit without loading unused vendor records", async () => {
  let calls = 0;
  const service = new OrderService({ vendorOrder: { findMany: async (query: { where: unknown; include: Record<string, unknown>; take: number }) => {
    calls++;
    assert.deepEqual(query.where, { vendorId: { in: ["vendor"] }, status: "IN_TRANSIT" });
    assert.equal(query.take, 100);
    assert.equal(query.include.vendor, undefined);
    for (const required of ["order", "shop", "items", "shipments", "dispatches"]) assert.ok(query.include[required]);
    return [];
  } } } as never);
  assert.deepEqual(await service.vendorOrders(seller, "IN_TRANSIT"), []);
  assert.equal(calls, 1);
  assert.deepEqual(await service.vendorOrders({ ...seller, principal: { ...seller.principal, vendorIds: [] } }), []);
  assert.equal(calls, 1);
  await assert.rejects(() => service.vendorOrders({ ...seller, status: "SUSPENDED" }), (error: unknown) => error instanceof ApiProblem && error.status === 403);
});

test("elevated readers without membership still reach the order query", async () => {
  for (const role of ["SUPER_ADMIN", "OPERATIONS_ADMIN"] as const) {
    let calls = 0;
    const service = new OrderService({ vendorOrder: { findUnique: async () => { calls++; return null; } } } as never);
    const session = { ...seller, principal: { ...seller.principal, roles: [role], vendorIds: [] } };
    await assert.rejects(() => service.vendorOrder(session, "missing"), (error: unknown) => error instanceof ApiProblem && error.status === 404);
    assert.equal(calls, 1);
  }
});

test("seller membership never grants access to a different vendor order", async () => {
  const service = new OrderService({ vendorOrder: { findUnique: async () => ({ vendorId: "other" }) } } as never);
  await assert.rejects(() => service.vendorOrder(seller, "other-package"), (error: unknown) => error instanceof ApiProblem && error.status === 403);
});
