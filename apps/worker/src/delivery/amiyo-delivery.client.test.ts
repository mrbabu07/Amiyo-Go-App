import assert from "node:assert/strict";
import test from "node:test";
import { createHmac } from "node:crypto";
import { AmiyoDeliveryClient, signDeliveryRequest } from "./amiyo-delivery.client.js";

test("delivery signatures match the legacy timestamped HMAC contract", () => {
  const expected = `sha256=${createHmac("sha256", "secret-value").update("123.{\"ok\":true}").digest("hex")}`;
  assert.equal(signDeliveryRequest('{"ok":true}', "123", "secret-value"), expected);
});

test("delivery client sends the stable idempotency key and normalizes response", async () => {
  const originalFetch = globalThis.fetch; let sentKey = "";
  globalThis.fetch = async (_input, init) => { sentKey = new Headers(init?.headers).get("Idempotency-Key") || ""; return new Response(JSON.stringify({ deliveryOrderId: "delivery-1", trackingId: "TRK-1" }), { status: 200, headers: { "Content-Type": "application/json" } }); };
  try {
    const client = new AmiyoDeliveryClient({ apiUrl: "https://delivery.example.com", integrationToken: "integration-token", signingSecret: "signing-secret", timeoutMs: 1000 });
    const result = await client.createDelivery({ orderId: crypto.randomUUID(), orderNumber: "AGO-1", vendorOrderId: crypto.randomUUID(), customer: { name: "Customer", phone: "01700000000", address: "Dhaka", division: "Dhaka", district: "Dhaka", upazila: "", union: "" }, pickup: { name: "Shop", phone: "01800000000", address: "Dhaka", division: "Dhaka", district: "Dhaka", upazila: "", union: "" }, items: [{ productId: crypto.randomUUID(), title: "Item", sku: "SKU", quantity: 1, unitPriceMinor: "1000", totalPriceMinor: "1000" }], paymentType: "cod", codAmountMinor: "1000", deliveryFeeMinor: "0", currency: "BDT", readyForPickup: true, dispatchRequested: true }, "delivery-create:vendor-1");
    assert.equal(sentKey, "delivery-create:vendor-1"); assert.equal(result.externalOrderId, "delivery-1"); assert.equal(result.trackingNumber, "TRK-1");
  } finally { globalThis.fetch = originalFetch; }
});
