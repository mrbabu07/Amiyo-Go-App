import assert from "node:assert/strict";
import test from "node:test";
import { pendingSslCommerzActionUrl } from "./order.service.js";

const payment = (actionUrl: string) => ({ method: "SSLCOMMERZ", status: "REQUIRES_ACTION", attempts: [{ status: "requires_action", responseSnapshot: { actionUrl } }] });

test("pending customer orders expose only stored HTTPS SSLCommerz actions", () => {
  const sandbox = "https://sandbox.sslcommerz.com/gwprocess/v4/gw.php?Q=demo";
  assert.equal(pendingSslCommerzActionUrl("PENDING_PAYMENT", payment(sandbox)), sandbox);
  assert.equal(pendingSslCommerzActionUrl("CONFIRMED", payment(sandbox)), null);
  assert.equal(pendingSslCommerzActionUrl("PENDING_PAYMENT", { ...payment(sandbox), method: "COD" }), null);
  assert.equal(pendingSslCommerzActionUrl("PENDING_PAYMENT", { ...payment(sandbox), status: "CAPTURED" }), null);
  assert.equal(pendingSslCommerzActionUrl("PENDING_PAYMENT", payment("http://sandbox.sslcommerz.com/pay")), null);
  assert.equal(pendingSslCommerzActionUrl("PENDING_PAYMENT", payment("https://evilsslcommerz.com/pay")), null);
  assert.equal(pendingSslCommerzActionUrl("PENDING_PAYMENT", { ...payment(sandbox), attempts: [{ status: "session_failed", responseSnapshot: { actionUrl: sandbox } }] }), null);
});
