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
    assert.deepEqual(query.include, { shop: true, items: true });
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

test("batched list preserves detail DTOs and starts bounded relation branches concurrently", async () => {
  const createdAt = new Date("2026-10-03T00:00:00Z");
  const parent = { id: "parent", orderNumber: "ORDER", currency: "BDT", addresses: [], payments: [], user: null };
  const rows = ["second", "first"].map((id) => ({ id, orderId: "parent", vendorId: "vendor", shopId: "shop", shop: { name: "Shop" }, status: "PLACED", createdAt, version: 1, subtotalMinor: 100n, discountMinor: 0n, deliveryMinor: 20n, totalMinor: 120n, items: [{ id: `item-${id}`, productId: "product", variantId: null, productNameSnapshot: "Purchased name", skuSnapshot: "SKU", attributesSnapshot: null, quantity: 1, unitPriceMinor: 100n, discountMinor: 0n, lineTotalMinor: 100n, currency: "BDT" }] }));
  const shipment = { id: "shipment", vendorOrderId: "second", status: "DELIVERED", provider: "courier", trackingNumber: "TRACK", events: [{ id: "event", status: "DELIVERED", description: "Delivered", location: null, occurredAt: createdAt }] };
  const started: string[] = [];
  let release: () => void = () => {};
  const barrier = new Promise<void>((resolve) => { release = resolve; });
  const branch = async (name: string) => { started.push(name); if (started.length === 3) release(); await barrier; };
  let baseReads = 0;
  const service = new OrderService({
    vendorOrder: { findMany: async (query: { where: unknown; select?: { dispatches: unknown } }) => {
      if (!query.select) { baseReads++; return rows; }
      assert.deepEqual(query.where, { id: { in: ["second", "first"] } });
      assert.deepEqual(query.select.dispatches, { orderBy: { createdAt: "desc" }, take: 1 });
      await branch("dispatches");
      return [{ id: "first", dispatches: [] }, { id: "second", dispatches: [{ status: "SENT" }] }];
    } },
    order: { findMany: async (query: { where: unknown; include: { payments: unknown } }) => {
      assert.deepEqual(query.where, { id: { in: ["parent"] } });
      assert.deepEqual(query.include.payments, { orderBy: { createdAt: "desc" }, take: 1 });
      await branch("orders"); return [parent];
    } },
    shipment: { findMany: async (query: { where: unknown; include: unknown }) => {
      assert.deepEqual(query.where, { vendorOrderId: { in: ["second", "first"] } });
      assert.deepEqual(query.include, { events: { orderBy: { occurredAt: "asc" } } });
      await branch("shipments"); return [shipment];
    } }
  } as never);
  const result = await service.vendorOrders(seller);
  const expected = await Promise.all(rows.map((row) => new OrderService({ vendorOrder: { findUnique: async () => ({ ...row, order: parent, shipments: row.id === "second" ? [shipment] : [], dispatches: row.id === "second" ? [{ status: "SENT" }] : [] }) } } as never).vendorOrder(seller, row.id)));
  assert.deepEqual(result, expected);
  assert.equal(baseReads, 1);
  assert.equal(started.length, 3);
});
