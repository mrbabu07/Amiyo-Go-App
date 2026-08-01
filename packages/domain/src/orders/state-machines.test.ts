import assert from "node:assert/strict";
import test from "node:test";
import { canTransitionPayment, canTransitionReturn, canTransitionVendorOrder, deliveryOutboxKey, deriveParentOrderStatus } from "./state-machines.js";

test("vendor order follows the approved fulfillment sequence", () => {
  assert.equal(canTransitionVendorOrder("PLACED", "ACCEPTED"), true);
  assert.equal(canTransitionVendorOrder("ACCEPTED", "PROCESSING"), true);
  assert.equal(canTransitionVendorOrder("PROCESSING", "READY_TO_SHIP"), true);
  assert.equal(canTransitionVendorOrder("READY_TO_SHIP", "PICKED_UP"), true);
});

test("vendor order cannot skip from placed to delivered", () => {
  assert.equal(canTransitionVendorOrder("PLACED", "DELIVERED"), false);
});

test("captured payment can be partially or fully refunded", () => {
  assert.equal(canTransitionPayment("CAPTURED", "PARTIALLY_REFUNDED"), true);
  assert.equal(canTransitionPayment("CAPTURED", "REFUNDED"), true);
  assert.equal(canTransitionPayment("REFUNDED", "CAPTURED"), false);
});

test("return requires review before approval", () => {
  assert.equal(canTransitionReturn("REQUESTED", "REVIEWING"), true);
  assert.equal(canTransitionReturn("REQUESTED", "APPROVED"), false);
});

test("delivery outbox key follows production idempotency rule", () => {
  assert.equal(deliveryOutboxKey("vendor-order-123"), "delivery-create:vendor-order-123");
});

test("parent status advances only when every active vendor reaches the delivery gate", () => {
  assert.equal(deriveParentOrderStatus(["PROCESSING", "READY_TO_SHIP"]), "PROCESSING");
  assert.equal(deriveParentOrderStatus(["READY_TO_SHIP", "READY_TO_SHIP"]), "READY_TO_SHIP");
  assert.equal(deriveParentOrderStatus(["PICKED_UP", "DELIVERED"]), "SHIPPED");
  assert.equal(deriveParentOrderStatus(["DELIVERED", "DELIVERED"]), "DELIVERED");
  assert.equal(deriveParentOrderStatus(["REJECTED", "CANCELLED"]), "CANCELLED");
});
