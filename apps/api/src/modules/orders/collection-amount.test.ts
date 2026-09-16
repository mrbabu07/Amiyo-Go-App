import assert from "node:assert/strict";
import test from "node:test";
import { parcelCollectionAmount } from "./collection-amount.js";

test("COD labels collect only the selected package balance", () => {
  assert.equal(parcelCollectionAmount(1200n, { method: "COD", status: "AUTHORIZED" }, "READY_TO_SHIP"), 1200n);
});

test("settled, refunded, cancelled and prepaid parcels cannot collect again", () => {
  for (const status of ["CAPTURED", "PARTIALLY_REFUNDED", "REFUNDED", "VOIDED", "FAILED"]) assert.equal(parcelCollectionAmount(1200n, { method: "COD", status }, "DELIVERED"), 0n);
  for (const status of ["CANCELLED", "REJECTED", "RETURNED", "REFUNDED"]) assert.equal(parcelCollectionAmount(1200n, { method: "COD", status: "AUTHORIZED" }, status), 0n);
  assert.equal(parcelCollectionAmount(1200n, { method: "CARD", status: "CAPTURED" }, "PLACED"), 0n);
  assert.equal(parcelCollectionAmount(1200n, undefined, "PLACED"), 0n);
});
