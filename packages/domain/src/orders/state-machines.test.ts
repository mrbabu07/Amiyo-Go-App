import assert from "node:assert/strict";
import test from "node:test";
import { canTransitionVendorOrder, deliveryOutboxKey } from "./state-machines.js";

test("vendor order can move from packed to ready to ship", () => {
  assert.equal(canTransitionVendorOrder("PACKED", "READY_TO_SHIP"), true);
});

test("vendor order cannot skip from pending to delivered", () => {
  assert.equal(canTransitionVendorOrder("PENDING", "DELIVERED"), false);
});

test("delivery outbox key follows production idempotency rule", () => {
  assert.equal(deliveryOutboxKey("order-123"), "delivery-create:order-123");
});
