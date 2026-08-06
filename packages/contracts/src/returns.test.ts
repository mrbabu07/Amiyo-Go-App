import assert from "node:assert/strict";
import test from "node:test";
import { sellerReturnReceiptSchema, sellerReturnResponseSchema } from "./returns.js";

test("seller return disputes require a reason", () => {
  assert.throws(() => sellerReturnResponseSchema.parse({ expectedVersion: 1, action: "DISPUTE" }));
  assert.equal(sellerReturnResponseSchema.parse({ expectedVersion: 1, action: "APPROVE" }).evidenceStorageKeys.length, 0);
});

test("seller receipt validates quantity and condition", () => {
  assert.equal(sellerReturnReceiptSchema.parse({ expectedVersion: 2, condition: "damaged", receivedQuantity: 1 }).condition, "damaged");
  assert.throws(() => sellerReturnReceiptSchema.parse({ expectedVersion: 2, condition: "unknown", receivedQuantity: 0 }));
});
