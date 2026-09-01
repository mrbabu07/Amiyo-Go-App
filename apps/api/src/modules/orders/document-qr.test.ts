import assert from "node:assert/strict";
import test from "node:test";
import { buildInvoiceQrPayload, buildParcelQrPayload, verifyDocumentQrPayload } from "./document-qr.js";

const secret = "test-document-qr-secret-that-is-long-enough";
const now = new Date("2026-09-01T00:00:00.000Z");

test("parcel QR is signed, vendor scoped and contains no customer PII", () => {
  const payload = buildParcelQrPayload({ orderId: "order-1", vendorId: "vendor-1", vendorOrderId: "package-1", trackingNumber: "AG-TRACK-1", paymentMode: "C", paymentStatus: "AUTHORIZED", orderStatus: "READY_TO_SHIP", amountMinor: "12345", currency: "BDT", itemCount: 2, quantity: 3 }, { now, secret, ttlSeconds: 3600 });
  assert.match(payload, /^AGP2\|/);
  assert.doesNotMatch(payload, /customer|phone|address/i);
  const result = verifyDocumentQrPayload(payload, { now, secret });
  assert.equal(result.valid, true);
  if (result.valid && result.claims.type === "parcel") {
    assert.equal(result.claims.vendorOrderId, "package-1");
    assert.equal(result.claims.amountMinor, "12345");
    assert.equal(result.claims.quantity, 3);
  }
});

test("document QR rejects tampering and expiry", () => {
  const payload = buildParcelQrPayload({ orderId: "order-1", vendorId: "vendor-1", vendorOrderId: "package-1", trackingNumber: "AG-TRACK-1", paymentMode: "P", paymentStatus: "CAPTURED", orderStatus: "SHIPPED", amountMinor: "9500", currency: "BDT", itemCount: 1, quantity: 1 }, { now, secret, ttlSeconds: 60 });
  assert.deepEqual(verifyDocumentQrPayload(payload.replace("A=95.00", "A=5.00"), { now, secret }), { valid: false, reason: "INVALID_SIGNATURE" });
  assert.deepEqual(verifyDocumentQrPayload(payload, { now: new Date("2026-09-01T00:02:00.000Z"), secret }), { valid: false, reason: "EXPIRED" });
});

test("invoice QR verifies invoice identity and exact total", () => {
  const payload = buildInvoiceQrPayload({ invoiceId: "invoice-1", invoiceNumber: "INV-AGO-100", orderId: "order-1", orderNumber: "AGO-100", totalMinor: "10600", currency: "BDT", issuedAt: now.toISOString() }, { now, secret });
  const result = verifyDocumentQrPayload(payload, { now, secret });
  assert.equal(result.valid, true);
  if (result.valid && result.claims.type === "invoice") {
    assert.equal(result.claims.invoiceNumber, "INV-AGO-100");
    assert.equal(result.claims.totalMinor, "10600");
  }
});
