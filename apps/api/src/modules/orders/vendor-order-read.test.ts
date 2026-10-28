import assert from "node:assert/strict";
import test from "node:test";
import type { Session } from "@amiyo/contracts";
import { ApiProblem } from "../../middleware/api-problem.js";
import { OrderService } from "./order.service.js";

const seller = { status: "ACTIVE", permissions: ["orders:read"], principal: { userId: "user", roles: ["VENDOR_OWNER"], vendorIds: ["vendor"] } } as Session;

test("seller search filters before pagination and retains vendor ownership", async () => {
  const service = new OrderService({ vendorOrder: { findMany: async (query: { where: Record<string, unknown>; take: number }) => {
    assert.deepEqual(query.where.vendorId, { in: ["vendor"] });
    assert.deepEqual(query.where.shop, { name: "Owned store" });
    assert.equal(query.where.status, "ACCEPTED");
    assert.deepEqual(query.where.order, { payments: { some: { method: { equals: "COD", mode: "insensitive" } } } });
    assert.equal((query.where.OR as unknown[]).length, 5);
    assert.match(JSON.stringify(query.where.OR), /Rice/);
    assert.equal(query.take, 3);
    return [];
  } } } as never);
  await service.vendorOrders(seller, { search: " Rice ", shop: "Owned store", status: "ACCEPTED", payment: "COD", limit: 2 });
});

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

test("vendor list keeps scope, status and limit with a summary-only projection", async () => {
  let calls = 0;
  const service = new OrderService({ vendorOrder: { findMany: async (query: { where: unknown; select: Record<string, unknown>; take: number }) => {
    calls++;
    assert.deepEqual(query.where, { vendorId: { in: ["vendor"] }, status: "IN_TRANSIT", orderId: "11111111-1111-4111-8111-111111111111" });
    assert.equal(query.take, 31);
    assert.equal(query.select.vendor, undefined);
    assert.equal(query.select.shipments, undefined);
    assert.equal(query.select.dispatches, undefined);
    assert.equal(query.select.order, undefined);
    assert.equal(query.select.items, undefined);
    return [];
  } } } as never);
  assert.deepEqual(await service.vendorOrders(seller, { status: "IN_TRANSIT", orderId: "11111111-1111-4111-8111-111111111111" }), { data: [], pageInfo: { hasNextPage: false, nextCursor: null } });
  assert.equal(calls, 1);
  assert.deepEqual(await service.vendorOrders({ ...seller, principal: { ...seller.principal, vendorIds: [] } }), { data: [], pageInfo: { hasNextPage: false, nextCursor: null } });
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

test("vendor detail authorizes first and loads bounded relations in one joined read", async () => {
  const createdAt = new Date("2026-10-03T00:00:00Z");
  const row = { id: "package", orderId: "parent", vendorId: "vendor", shopId: "shop", status: "PLACED", subtotalMinor: 100n, discountMinor: 0n, deliveryMinor: 20n, totalMinor: 120n, commissionMinor: 6n, version: 1, createdAt, updatedAt: createdAt, order: { orderNumber: "AG-100", currency: "BDT", fulfillmentMethod: "DELIVERY", pickupPointSnapshot: null, openBoxAllowed: false, inspectionMinutes: 0, addresses: [], payments: [], reservations: [], vendorOrders: [], user: null }, shop: { id: "shop", vendorId: "vendor", name: "Shop", slug: "shop", status: "ACTIVE", settings: {}, createdAt, updatedAt: createdAt }, items: [], shipments: [], dispatches: [] };
  let calls = 0;
  const client = {
    vendorOrder: { findUnique: async (query: { select?: Record<string, unknown>; include?: Record<string, unknown> }) => {
      calls++;
      if (query.select) { assert.deepEqual(query.select, { id: true, vendorId: true }); return { id: "package", vendorId: "vendor" }; }
      assert.ok(query.include?.order); assert.ok(query.include?.items); assert.ok(query.include?.shipments); assert.ok(query.include?.dispatches);
      return row;
    } }
  };
  const result = await new OrderService(client as never).vendorOrder(seller, "package");
  assert.equal(calls, 2);
  assert.equal(result.id, "package");
  assert.equal(result.shopName, "Shop");
});

test("seller opens an audited order-scoped customer thread with active shop members", async () => {
  const createdParticipants: Array<{ userId: string; role: string }> = [];
  const client = {
    vendorOrder: { findUnique: async () => ({ id: "package", orderId: "parent", vendorId: "vendor", order: { orderNumber: "AG-100", userId: "customer" } }) },
    $transaction: async (operation: (transaction: unknown) => Promise<unknown>) => operation(client),
    chatThread: {
      findFirst: async () => null,
      create: async ({ data }: { data: { vendorId: string; subject: string; metadata: unknown; participants: { create: Array<{ userId: string; role: string }> } } }) => {
        assert.equal(data.vendorId, "vendor");
        assert.equal(data.subject, "Order AG-100");
        assert.deepEqual(data.metadata, { orderId: "parent", vendorOrderId: "package" });
        createdParticipants.push(...data.participants.create);
        return { id: "thread" };
      }
    },
    vendorMember: { findMany: async () => [{ userId: "user" }, { userId: "staff" }] },
    auditLog: { create: async ({ data }: { data: { action: string; resourceId: string } }) => { assert.equal(data.action, "order.customer_chat_opened"); assert.equal(data.resourceId, "package"); } }
  };
  assert.deepEqual(await new OrderService(client as never).customerThread(seller, "package"), { id: "thread" });
  assert.deepEqual(createdParticipants, [{ userId: "customer", role: "customer" }, { userId: "user", role: "vendor" }, { userId: "staff", role: "vendor" }]);
});

test("seller customer chat reuses an open buyer thread and denies another seller", async () => {
  let upserted = false;
  const client = {
    vendorOrder: { findUnique: async () => ({ id: "package", orderId: "parent", vendorId: "vendor", order: { orderNumber: "AG-100", userId: "customer" } }) },
    $transaction: async (operation: (transaction: unknown) => Promise<unknown>) => operation(client),
    chatThread: { findFirst: async () => ({ id: "existing" }) },
    chatParticipant: { upsert: async ({ create }: { create: { threadId: string; userId: string; role: string } }) => { assert.deepEqual(create, { threadId: "existing", userId: "user", role: "vendor" }); upserted = true; } }
  };
  assert.deepEqual(await new OrderService(client as never).customerThread(seller, "package"), { id: "existing" });
  assert.equal(upserted, true);
  await assert.rejects(() => new OrderService({ vendorOrder: client.vendorOrder } as never).customerThread({ ...seller, principal: { ...seller.principal, vendorIds: ["other"] } }, "package"), (error: unknown) => error instanceof ApiProblem && error.status === 403);
});

test("seller delivery exception is idempotent, audited and never changes courier status", async () => {
  const input = { category: "CARRIER_NO_SHOW" as const, requestedResolution: "INVESTIGATE" as const, reason: "Courier did not arrive in the pickup window", notes: "Called twice", retryAt: null };
  let eventData: Record<string, unknown> | undefined;
  let idempotencyResponse: unknown;
  const client = {
    $transaction: async (operation: (transaction: unknown) => Promise<unknown>) => operation(client),
    idempotencyRecord: { findUnique: async () => null, create: async ({ data }: { data: { response: unknown } }) => { idempotencyResponse = data.response; } },
    vendorOrder: { findUnique: async () => ({ id: "package", orderId: "parent", vendorId: "vendor", order: { userId: "customer", orderNumber: "AG-100" }, shop: { name: "Demo Shop" }, shipments: [{ id: "shipment", status: "READY_TO_SHIP", provider: "amiyo_delivery" }] }) },
    failedDeliveryRecord: { upsert: async ({ create }: { create: { resolution: string; reason: string } }) => { assert.equal(create.resolution, "vendor_reported"); assert.equal(create.reason, input.reason); } },
    shipment: { update: async ({ data }: { data: Record<string, unknown> }) => { eventData = data; } },
    notification: { upsert: async ({ create }: { create: { userId: string; type: string } }) => { assert.equal(create.userId, "customer"); assert.equal(create.type, "order.delivery_exception"); } },
    auditLog: { create: async ({ data }: { data: { action: string; actorType: string } }) => { assert.equal(data.action, "logistics.delivery_exception.vendor_reported"); assert.equal(data.actorType, "vendor"); } }
  };
  const result = await new OrderService(client as never).reportDeliveryException({ ...seller, permissions: ["orders:read", "orders:manage"] }, "package", input, "44444444-4444-4444-8444-444444444444");
  assert.equal(result.status, "vendor_reported");
  assert.equal(eventData?.status, undefined);
  assert.ok(eventData?.events);
  assert.deepEqual(idempotencyResponse, result);
});

test("delivery exception rejects another seller and completed parcels", async () => {
  const input = { category: "OTHER" as const, requestedResolution: "INVESTIGATE" as const, reason: "Parcel workflow needs operations review", notes: null, retryAt: null };
  const row = { id: "package", orderId: "parent", vendorId: "vendor", order: { userId: "customer", orderNumber: "AG-100" }, shop: { name: "Demo Shop" }, shipments: [{ id: "shipment", status: "DELIVERED", provider: "courier" }] };
  const client = { $transaction: async (operation: (transaction: unknown) => Promise<unknown>) => operation(client), idempotencyRecord: { findUnique: async () => null }, vendorOrder: { findUnique: async () => row } };
  await assert.rejects(() => new OrderService(client as never).reportDeliveryException({ ...seller, permissions: ["orders:manage"], principal: { ...seller.principal, vendorIds: ["other"] } }, "package", input, "44444444-4444-4444-8444-444444444444"), (error: unknown) => error instanceof ApiProblem && error.status === 403);
  await assert.rejects(() => new OrderService(client as never).reportDeliveryException({ ...seller, permissions: ["orders:manage"] }, "package", input, "44444444-4444-4444-8444-444444444444"), (error: unknown) => error instanceof ApiProblem && error.code === "DELIVERY_EXCEPTION_NOT_ALLOWED");
});

test("seller pickup request is idempotent, audited and leaves courier status unchanged", async () => {
  const pickupDate = new Date(Date.now() + 86_400_000).toISOString();
  const input = { pickupDate, pickupWindow: "09:00-12:00" as const, note: "Two cartons" };
  let eventStatus: string | undefined;
  let storedResponse: unknown;
  const client = {
    $transaction: async (operation: (transaction: unknown) => Promise<unknown>) => operation(client),
    idempotencyRecord: { findUnique: async () => null, create: async ({ data }: { data: { response: unknown } }) => { storedResponse = data.response; } },
    vendorOrder: { findUnique: async () => ({ id: "11111111-1111-4111-8111-111111111111", vendorId: "vendor", shipments: [{ id: "22222222-2222-4222-8222-222222222222", status: "READY_TO_SHIP", assignment: null }] }) },
    logisticsAssignment: { upsert: async () => ({ version: 1 }) },
    shipmentEvent: { create: async ({ data }: { data: { status: string } }) => { eventStatus = data.status; } },
    auditLog: { create: async ({ data }: { data: { action: string } }) => { assert.equal(data.action, "logistics.pickup.vendor_requested"); } }
  };
  const result = await new OrderService(client as never).requestPickup({ ...seller, permissions: ["orders:manage"] }, "11111111-1111-4111-8111-111111111111", input, "44444444-4444-4444-8444-444444444444");
  assert.equal(result.status, "requested");
  assert.equal(eventStatus, "READY_TO_SHIP");
  assert.deepEqual(storedResponse, result);
});

test("pickup request rejects another seller, assigned pickups and non-ready parcels", async () => {
  const input = { pickupDate: new Date(Date.now() + 86_400_000).toISOString(), pickupWindow: "12:00-16:00" as const, note: null };
  const row = { id: "11111111-1111-4111-8111-111111111111", vendorId: "vendor", shipments: [{ id: "22222222-2222-4222-8222-222222222222", status: "READY_TO_SHIP", assignment: { courierPartnerId: "courier", pickupStaffId: null } }] };
  const client = { $transaction: async (operation: (transaction: unknown) => Promise<unknown>) => operation(client), idempotencyRecord: { findUnique: async () => null }, vendorOrder: { findUnique: async () => row } };
  await assert.rejects(() => new OrderService(client as never).requestPickup({ ...seller, permissions: ["orders:manage"], principal: { ...seller.principal, vendorIds: ["other"] } }, row.id, input, "44444444-4444-4444-8444-444444444444"), (error: unknown) => error instanceof ApiProblem && error.status === 403);
  await assert.rejects(() => new OrderService(client as never).requestPickup({ ...seller, permissions: ["orders:manage"] }, row.id, input, "44444444-4444-4444-8444-444444444444"), (error: unknown) => error instanceof ApiProblem && error.code === "PICKUP_ALREADY_ASSIGNED");
  row.shipments[0] = { id: "22222222-2222-4222-8222-222222222222", status: "DELIVERED", assignment: null as never };
  await assert.rejects(() => new OrderService(client as never).requestPickup({ ...seller, permissions: ["orders:manage"] }, row.id, input, "44444444-4444-4444-8444-444444444444"), (error: unknown) => error instanceof ApiProblem && error.code === "PICKUP_REQUEST_NOT_ALLOWED");
});

test("vendor list returns card summaries without loading detail-only relations", async () => {
  const createdAt = new Date("2026-10-03T00:00:00Z");
  const rows = ["second", "first"].map((id) => ({ id, orderId: "parent", vendorId: "vendor", shopId: "shop", shop: { name: "Shop" }, status: "PLACED", createdAt, totalMinor: 120n }));
  let reads = 0;
  let branches = 0;
  let release: (() => void) | undefined;
  const barrier = new Promise<void>((resolve) => { release = resolve; });
  const branch = async <T>(value: T) => { branches++; if (branches === 2) release?.(); await barrier; return value; };
  const service = new OrderService({
    vendorOrder: { findMany: async (query: { select: Record<string, unknown> }) => {
      reads++;
      assert.equal(query.select.shipments, undefined);
      assert.equal(query.select.dispatches, undefined);
      assert.equal(query.select.order, undefined);
      assert.equal(query.select.items, undefined);
      return rows;
    } },
    order: { findMany: async ({ where }: { where: unknown }) => { assert.deepEqual(where, { id: { in: ["parent"] } }); return branch([{ id: "parent", orderNumber: "ORDER", currency: "BDT", payments: [], user: null }]); } },
    orderItem: { findMany: async ({ where }: { where: unknown }) => {
      assert.deepEqual(where, { vendorOrderId: { in: ["second", "first"] } });
      return branch(rows.map((row) => ({ id: `item-${row.id}`, vendorOrderId: row.id, productId: "product", variantId: null, productNameSnapshot: "Purchased name", skuSnapshot: "SKU", attributesSnapshot: null, quantity: 1, unitPriceMinor: 100n, discountMinor: 0n, lineTotalMinor: 100n, currency: "BDT", product: { media: [{ storageKey: "https://cdn.amiyo.test/products/item.webp" }] } })));
    } }
  } as never);
  const result = await service.vendorOrders(seller);
  assert.equal(result.data.length, 2);
  assert.deepEqual(Object.keys(result.data[0] ?? {}).sort(), ["createdAt", "customer", "id", "items", "orderId", "orderNumber", "payment", "shopId", "shopName", "status", "total", "vendorId"]);
  assert.equal(result.data[0]?.items[0]?.thumbnailUrl, "https://cdn.amiyo.test/products/item.webp");
  assert.deepEqual(result.pageInfo, { hasNextPage: false, nextCursor: null });
  assert.equal(reads, 1);
  assert.equal(branches, 2);
});

test("vendor list returns a stable cursor without exposing the lookahead row", async () => {
  const createdAt = new Date("2026-10-03T00:00:00Z");
  const rows = ["third", "second", "first"].map((id) => ({ id, orderId: "parent", vendorId: "vendor", shopId: "shop", shop: { name: "Shop" }, status: "PLACED", createdAt, totalMinor: 120n }));
  const service = new OrderService({
    vendorOrder: { findMany: async (query: { cursor?: unknown; skip?: number; take: number; orderBy: unknown }) => {
      assert.equal(query.take, 3);
      assert.deepEqual(query.cursor, { id: "cursor-package" });
      assert.equal(query.skip, 1);
      assert.deepEqual(query.orderBy, [{ createdAt: "desc" }, { id: "desc" }]);
      return rows;
    } },
    order: { findMany: async () => [{ id: "parent", orderNumber: "ORDER", currency: "BDT", payments: [], user: null }] },
    orderItem: { findMany: async ({ where }: { where: unknown }) => { assert.deepEqual(where, { vendorOrderId: { in: ["third", "second"] } }); return []; } }
  } as never);
  const result = await service.vendorOrders(seller, { cursor: "cursor-package", limit: 2 });
  assert.deepEqual(result.data.map((item) => item.id), ["third", "second"]);
  assert.deepEqual(result.pageInfo, { hasNextPage: true, nextCursor: "second" });
});
