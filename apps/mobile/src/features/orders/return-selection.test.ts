import assert from "node:assert/strict";
import test from "node:test";
import { buildReturnSelection, remainingReturnQuantity } from "./return-selection";

const packageId = "00000000-0000-4000-8000-000000000001";
const first = "00000000-0000-4000-8000-000000000002";
const second = "00000000-0000-4000-8000-000000000003";
const available = [{ id: first, quantity: 3 }, { id: second, quantity: 2 }];
const build = (quantities: Record<string, number>) => buildReturnSelection(packageId, available, quantities, "DAMAGED", "  Broken  ", "MANUAL");

test("return sends only selected partial quantities and chosen refund preference", () => {
  const result = build({ [first]: 1, [second]: 0 });
  assert.deepEqual(result.items, [{ orderItemId: first, quantity: 1 }]);
  assert.equal(result.reasonDetail, "Broken");
  assert.equal(result.refundMethod, "MANUAL");
  assert.equal(result.vendorOrderId, packageId);
});
test("return rejects empty, excessive, fractional, negative and foreign selections", () => {
  const invalidSelections: Array<Record<string, number>> = [{}, { [first]: 0 }, { [first]: 4 }, { [first]: 0.5 }, { [first]: -1 }, { [first]: NaN }, { unknown: 1 }];
  for (const quantities of invalidSelections) assert.throws(() => build(quantities));
});
test("return validates reason and maximum details against the server contract", () => {
  assert.throws(() => buildReturnSelection(packageId, available, { [first]: 1 }, "", "", "ORIGINAL_PAYMENT"));
  assert.throws(() => buildReturnSelection(packageId, available, { [first]: 1 }, "OTHER", "x".repeat(1001), "ORIGINAL_PAYMENT"));
  assert.equal(buildReturnSelection(packageId, available, { [second]: 2 }, "OTHER", "", "ORIGINAL_PAYMENT").reasonDetail, null);
});

test("return honors remaining quantities and preserves explicit zero", () => {
  assert.equal(remainingReturnQuantity({ quantity: 3, returnableQuantity: 0 }), 0);
  assert.equal(remainingReturnQuantity({ quantity: 3, returnableQuantity: 1 }), 1);
  assert.equal(remainingReturnQuantity({ quantity: 3, returnableQuantity: 9 }), 3);
  assert.equal(remainingReturnQuantity({ quantity: 3 }), 3);
  const updated = [{ id: first, quantity: 3, returnableQuantity: 1 }];
  assert.throws(() => buildReturnSelection(packageId, updated, { [first]: 2 }, "OTHER", "", "ORIGINAL_PAYMENT"));
  assert.equal(buildReturnSelection(packageId, updated, { [first]: 1 }, "OTHER", "", "ORIGINAL_PAYMENT").items[0]?.quantity, 1);
  assert.throws(() => buildReturnSelection(packageId, [{ ...updated[0]!, returnableQuantity: 0 }], { [first]: 1 }, "OTHER", "", "ORIGINAL_PAYMENT"));
});
