import assert from "node:assert/strict";
import test from "node:test";
import { vendorDeliveryExceptionInputSchema, vendorDeliveryExceptionSchema } from "./delivery.js";

const input = { category: "CARRIER_NO_SHOW", requestedResolution: "INVESTIGATE", reason: "Courier missed the agreed pickup window", notes: null, retryAt: null };

test("seller delivery exceptions require bounded operational evidence", () => {
  assert.equal(vendorDeliveryExceptionInputSchema.safeParse(input).success, true);
  assert.equal(vendorDeliveryExceptionInputSchema.safeParse({ ...input, reason: "no" }).success, false);
  assert.equal(vendorDeliveryExceptionInputSchema.safeParse({ ...input, category: "UNKNOWN" }).success, false);
  assert.equal(vendorDeliveryExceptionInputSchema.safeParse({ ...input, retryAt: "not-a-date" }).success, false);
});

test("seller delivery exception response identifies its durable parcel record", () => {
  assert.equal(vendorDeliveryExceptionSchema.safeParse({ ...input, vendorOrderId: "11111111-1111-4111-8111-111111111111", shipmentId: "22222222-2222-4222-8222-222222222222", status: "vendor_reported", reportedAt: "2026-10-13T00:00:00.000Z" }).success, true);
});
