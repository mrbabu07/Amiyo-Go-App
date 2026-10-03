import assert from "node:assert/strict";
import test from "node:test";
import { cancellationState } from "./cancellation-policy";

const placed = Date.parse("2026-10-03T00:00:00Z");
const order = { createdAt: "2026-10-02T23:00:00Z", placedAt: new Date(placed).toISOString(), status: "CONFIRMED", vendorOrders: [{ status: "PLACED" }] };
test("cancellation uses placement time and excludes the exact deadline", () => {
  assert.equal(cancellationState(order, placed + 30 * 60_000 - 1).cancellable, true);
  assert.equal(cancellationState(order, placed + 30 * 60_000).cancellable, false);
  assert.equal(cancellationState(order, placed + 31 * 60_000).cancellable, false);
});
test("cancellation supports legacy dates but rejects invalid dates and started fulfillment", () => {
  assert.equal(cancellationState({ ...order, placedAt: null, createdAt: order.placedAt }, placed).cancellable, true);
  assert.equal(cancellationState({ ...order, placedAt: "invalid" }, placed).cancellable, false);
  assert.equal(cancellationState({ ...order, vendorOrders: [{ status: "READY_TO_SHIP" }] }, placed).cancellable, false);
  assert.equal(cancellationState({ ...order, status: "CANCELLED" }, placed).cancellable, false);
});
