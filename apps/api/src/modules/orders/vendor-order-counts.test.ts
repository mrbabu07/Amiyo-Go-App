import assert from "node:assert/strict";
import test from "node:test";
import type { Session } from "@amiyo/contracts";
import { OrderService } from "./order.service.js";

const seller = { status: "ACTIVE", permissions: ["orders:read"], principal: { userId: "seller", roles: ["VENDOR_OWNER"], vendorIds: ["owned"] } } as Session;
test("seller queue counts aggregate all scoped packages without pagination", async () => {
  const service = new OrderService({ vendorOrder: { groupBy: async (query: unknown) => {
    assert.deepEqual(query, { by: ["status"], where: { vendorId: { in: ["owned"] } }, _count: { _all: true } });
    return [{ status: "PLACED", _count: { _all: 150 } }, { status: "ACCEPTED", _count: { _all: 3 } }];
  } } } as never);
  assert.deepEqual(await service.vendorOrderCounts(seller), { total: 153, statuses: [{ status: "PLACED", count: 150 }, { status: "ACCEPTED", count: 3 }] });
});
test("queue counts reject inactive, unprivileged and non-seller accounts before database reads", async () => {
  const service = new OrderService({} as never);
  for (const session of [{ ...seller, status: "SUSPENDED" }, { ...seller, permissions: [] }, { ...seller, principal: { ...seller.principal, roles: ["CUSTOMER"], vendorIds: [] } }]) await assert.rejects(service.vendorOrderCounts(session as Session), /cannot access/);
});
