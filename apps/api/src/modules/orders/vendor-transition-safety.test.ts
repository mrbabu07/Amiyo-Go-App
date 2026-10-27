import assert from "node:assert/strict";
import test from "node:test";
import { createHash } from "node:crypto";
import type { Session } from "@amiyo/contracts";
import { OrderService } from "./order.service.js";

const seller = { status: "ACTIVE", permissions: ["orders:manage"], principal: { userId: "seller", roles: ["VENDOR_OWNER"], vendorIds: ["owned"] } } as Session;
function service(vendorId = "owned", previous: unknown = null) {
  const transaction = { vendorOrder: { findUnique: async () => ({ vendorId, version: 2, status: "PLACED", order: { status: "CONFIRMED" } }) }, idempotencyRecord: { findUnique: async () => previous } };
  return new OrderService({ $transaction: async (work: (value: unknown) => unknown) => work(transaction) } as never);
}
test("transition replay rechecks current vendor ownership and active permissions", async () => {
  const input = { status: "ACCEPTED" as const, expectedVersion: 1 };
  const receipt = { requestHash: createHash("sha256").update(JSON.stringify(input)).digest("hex"), response: { saved: true } };
  await assert.rejects(service("other", receipt).transitionVendorOrder(seller, "package", input, "key"), /cannot access/);
  await assert.rejects(service("owned", receipt).transitionVendorOrder({ ...seller, status: "SUSPENDED" }, "package", input, "key"), /management access/);
  assert.deepEqual(await service("owned", receipt).transitionVendorOrder(seller, "package", input, "key"), { saved: true });
});
test("seller cannot bypass rejection evidence or perform courier transitions", async () => {
  await assert.rejects(service().transitionVendorOrder(seller, "package", { status: "REJECTED", expectedVersion: 2 }, "key"), /five characters/);
  await assert.rejects(service().transitionVendorOrder(seller, "package", { status: "DELIVERED", expectedVersion: 2 }, "key"), /operations/);
});
