import assert from "node:assert/strict";
import test from "node:test";
import { wishlistAvailableQuantity } from "./engagement.service.js";

test("wishlist availability sums sellable stock across active variants", () => {
  assert.equal(wishlistAvailableQuantity([{ inventory: { onHand: 8, reserved: 3 } }, { inventory: { onHand: 2, reserved: 5 } }, { inventory: null }]), 5);
});
