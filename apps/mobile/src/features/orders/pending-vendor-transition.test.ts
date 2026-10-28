import assert from "node:assert/strict";
import test from "node:test";
import { mayDiscardVendorTransition } from "./pending-vendor-transition";

test("only fresh definite pre-write transition rejections can clear recovery", () => {
  assert.equal(mayDiscardVendorTransition(true, 409, "VENDOR_ORDER_VERSION_CONFLICT"), true);
  assert.equal(mayDiscardVendorTransition(false, 409, "VENDOR_ORDER_VERSION_CONFLICT"), false);
  assert.equal(mayDiscardVendorTransition(true, 500, "VENDOR_ORDER_VERSION_CONFLICT"), false);
  assert.equal(mayDiscardVendorTransition(true, 409, "IDEMPOTENCY_KEY_REUSED"), false);
});
