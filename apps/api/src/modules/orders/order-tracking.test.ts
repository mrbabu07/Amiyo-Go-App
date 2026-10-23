import assert from "node:assert/strict";
import test from "node:test";
import type { Session } from "@amiyo/contracts";
import { ApiProblem } from "../../middleware/api-problem.js";
import { OrderService } from "./order.service.js";

const session = { principal: { userId: "customer" } } as Session;

test("tracking verifies ownership before loading packages", async () => {
  let relationReads = 0;
  const service = new OrderService({
    order: { findFirst: async ({ where, select }: { where: unknown; select: Record<string, unknown> }) => {
      assert.deepEqual(where, { id: "missing", userId: "customer" });
      assert.deepEqual(select, { id: true, orderNumber: true, status: true });
      return null;
    } },
    vendorOrder: { findMany: async () => { relationReads++; return []; } },
    shipment: { findMany: async () => { relationReads++; return []; } }
  } as never);
  await assert.rejects(() => service.tracking(session, "missing"), (error: unknown) => error instanceof ApiProblem && error.code === "ORDER_NOT_FOUND");
  assert.equal(relationReads, 0);
});

test("tracking starts package and shipment reads concurrently and preserves package order", async () => {
  let started = 0;
  let release: (() => void) | undefined;
  const barrier = new Promise<void>((resolve) => { release = resolve; });
  const branch = async <T>(value: T) => {
    started++;
    if (started === 2) release?.();
    await barrier;
    return value;
  };
  const occurredAt = new Date("2026-10-23T00:00:00Z");
  const client = {
    order: { findFirst: async () => ({ id: "order", orderNumber: "AGO-100", status: "SHIPPED" }) },
    vendorOrder: { findMany: async ({ where, orderBy }: { where: unknown; orderBy: unknown }) => {
      assert.deepEqual(where, { orderId: "order" });
      assert.deepEqual(orderBy, { createdAt: "asc" });
      return branch([{ id: "package-1", shop: { name: "First shop" } }, { id: "package-2", shop: { name: "Second shop" } }]);
    } },
    shipment: { findMany: async ({ where, include }: { where: unknown; include: { events: { orderBy: unknown } } }) => {
      assert.deepEqual(where, { vendorOrder: { orderId: "order" } });
      assert.deepEqual(include.events.orderBy, { occurredAt: "asc" });
      return branch([{ id: "shipment", vendorOrderId: "package-2", status: "IN_TRANSIT", provider: "courier", trackingNumber: "TRACK-2", assignment: null, events: [{ id: "event", status: "IN_TRANSIT", description: "Moving", location: "Dhaka", occurredAt }] }]);
    } }
  };
  const result = await new OrderService(client as never).tracking(session, "order");
  assert.equal(started, 2);
  assert.deepEqual(result.shipments.map((item) => item.vendorOrderId), ["package-1", "package-2"]);
  assert.equal(result.shipments[0]?.shipment, null);
  assert.equal(result.shipments[1]?.shipment?.events[0]?.occurredAt, occurredAt.toISOString());
});
