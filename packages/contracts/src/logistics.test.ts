import assert from "node:assert/strict";
import test from "node:test";
import { codRemittanceInputSchema, logisticsCodStateInputSchema, logisticsDeliveryAttemptSchema, logisticsManifestPickupSchema, logisticsReturnActionSchema, logisticsTrackingEventSchema } from "./logistics.js";

const shipmentId = "11111111-1111-4111-8111-111111111111";

test("tracking events require valid state and operational evidence", () => {
  assert.equal(logisticsTrackingEventSchema.safeParse({ shipmentId, status: "IN_TRANSIT", description: "Reached Dhaka hub", location: "Dhaka", occurredAt: "2026-08-14T12:00:00.000Z", providerEventId: "evt-1" }).success, true);
  assert.equal(logisticsTrackingEventSchema.safeParse({ shipmentId, status: "UNKNOWN", description: "x", occurredAt: "bad" }).success, false);
});

test("manifest pickup cannot be empty", () => {
  assert.equal(logisticsManifestPickupSchema.safeParse({ shipmentIds: [shipmentId], note: "Courier pickup confirmed" }).success, true);
  assert.equal(logisticsManifestPickupSchema.safeParse({ shipmentIds: [], note: "Courier pickup confirmed" }).success, false);
});

test("delivery attempts require outcome evidence and assignment version", () => {
  assert.equal(logisticsDeliveryAttemptSchema.safeParse({ outcome: "delivered", receiverName: "Customer", codCollected: true, expectedAssignmentVersion: 2 }).success, true);
  assert.equal(logisticsDeliveryAttemptSchema.safeParse({ outcome: "delivered", receiverName: null, codCollected: false, expectedAssignmentVersion: 2 }).success, false);
  assert.equal(logisticsDeliveryAttemptSchema.safeParse({ outcome: "failed", reason: null, codCollected: false, expectedAssignmentVersion: 2 }).success, false);
  assert.equal(logisticsDeliveryAttemptSchema.safeParse({ outcome: "failed", reason: "Customer unavailable", codCollected: true, expectedAssignmentVersion: 2 }).success, false);
});

test("reverse logistics accepts structured inspection evidence", () => {
  const parsed = logisticsReturnActionSchema.parse({ note: "Warehouse inspection completed", inspection: { condition: "sellable", photos: ["media/return-1.jpg"] } });
  assert.equal(parsed.inspection?.condition, "sellable");
});

test("COD state evidence is bounded and explicit", () => {
  assert.equal(logisticsCodStateInputSchema.safeParse({ reference: "REM-100", reason: null, note: "Courier remittance received" }).success, true);
  assert.equal(logisticsCodStateInputSchema.safeParse({ note: "x" }).success, false);
});

test("COD remittance amounts preserve finance invariants", () => {
  const valid = { courierPartnerId: null, courierName: "Amiyo Delivery", collectedAmountMinor: "10000", remittedAmountMinor: "9000", forwardedToVendorMinor: "8000", reference: "REM-100", notes: null, orderIds: [shipmentId] };
  assert.equal(codRemittanceInputSchema.safeParse(valid).success, true);
  assert.equal(codRemittanceInputSchema.safeParse({ ...valid, remittedAmountMinor: "11000" }).success, false);
  assert.equal(codRemittanceInputSchema.safeParse({ ...valid, forwardedToVendorMinor: "9500" }).success, false);
  assert.equal(codRemittanceInputSchema.safeParse({ ...valid, reference: "" }).success, false);
  assert.equal(codRemittanceInputSchema.safeParse({ ...valid, orderIds: [shipmentId, shipmentId] }).success, false);
});
