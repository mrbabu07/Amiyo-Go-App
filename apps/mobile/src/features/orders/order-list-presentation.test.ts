import assert from "node:assert/strict";
import test from "node:test";
import { orderFilters, orderProgressStep, orderStatusGroup } from "./order-list-presentation";

test("reference order filters classify every supported parent order state", () => {
  const expected = {
    PENDING_PAYMENT: "TO_PAY", CONFIRMED: "PROCESSING", PROCESSING: "PROCESSING", READY_TO_SHIP: "PROCESSING", SHIPPED: "SHIPPED", DELIVERED: "DELIVERED", CANCELLED: "CANCELLED", RETURN_REQUESTED: "RETURN", RETURNED: "RETURN", REFUNDED: "RETURN"
  };
  for (const [status, group] of Object.entries(expected)) assert.equal(orderStatusGroup(status), group);
  assert.equal(orderStatusGroup("UNKNOWN"), null);
  assert.deepEqual(orderFilters.map((filter) => filter.label), ["All", "To Pay", "Processing", "Shipped", "Delivered", "Cancelled", "Return / refund"]);
  assert.equal(orderFilters.length, 7);
});

test("after-sales and unknown states cannot be misrepresented as shipped", () => {
  for (const status of ["CANCELLED", "RETURN_REQUESTED", "RETURNED", "REFUNDED", "UNKNOWN"]) assert.equal(orderProgressStep(status), null);
  assert.equal(orderProgressStep("CONFIRMED"), 0);
  assert.equal(orderProgressStep("READY_TO_SHIP"), 1);
  assert.equal(orderProgressStep("SHIPPED"), 2);
  assert.equal(orderProgressStep("DELIVERED"), 3);
});
