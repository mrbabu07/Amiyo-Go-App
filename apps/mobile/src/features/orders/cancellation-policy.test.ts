import assert from "node:assert/strict";
import test from "node:test";
import { cancellationState } from "./cancellation-policy";

const placed = Date.parse("2026-10-03T00:00:00Z");
const order = { cancellation: { deadline: new Date(placed + 45 * 60_000).toISOString(), windowMinutes: 45 }, status: "CONFIRMED", vendorOrders: [{ status: "PLACED" }] };
test("cancellation uses the server deadline and excludes the exact deadline", () => {
  assert.equal(cancellationState(order, placed + 30 * 60_000 - 1).cancellable, true);
  assert.equal(cancellationState(order, placed + 45 * 60_000).cancellable, false);
  assert.equal(cancellationState(order, placed + 46 * 60_000).cancellable, false);
  assert.equal(cancellationState(order, placed).windowMinutes, 45);
});
test("cancellation fails closed without a valid policy and after fulfillment starts", () => {
  assert.equal(cancellationState({ ...order, cancellation: undefined }, placed).cancellable, false);
  assert.equal(cancellationState({ ...order, cancellation: { deadline: "invalid", windowMinutes: 45 } }, placed).cancellable, false);
  assert.equal(cancellationState({ ...order, vendorOrders: [{ status: "READY_TO_SHIP" }] }, placed).cancellable, false);
  assert.equal(cancellationState({ ...order, status: "CANCELLED" }, placed).cancellable, false);
});
