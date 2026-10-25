import assert from "node:assert/strict";
import test from "node:test";
import { checkoutQuoteInputSchema } from "./commerce.js";
import { deliverySettingsInputSchema, deliverySettingsSchema, pickupPointInputSchema } from "./delivery.js";

const zones = { sameUnion: true, sameUpazila: true, sameDistrict: false, outsideDistrict: false };
const settings = {
  key: "default", standardChargeMinor: "10000", freeDeliveryEnabled: true, freeDeliveryThresholdMinor: "1100000",
  baseLocation: { division: "Chattogram", district: "Cox's Bazar", upazila: "Teknaf", union: "Hnila" },
  zoneFees: { sameUnionMinor: "6000", sameUpazilaMinor: "8000", sameDistrictMinor: "12000", outsideDistrictMinor: "15000" },
  serviceableZones: zones, inspectionPolicy: { openBoxAllowed: true, inspectionMinutes: 5 }, estimatedDays: { min: 2, max: 5 }, version: 1
};

test("delivery settings expose independently controlled manual service zones", () => {
  assert.deepEqual(deliverySettingsSchema.parse(settings).serviceableZones, zones);
});

test("admin delivery updates require an explicit decision for every zone", () => {
  const { key: _key, version, ...input } = settings;
  assert.equal(deliverySettingsInputSchema.safeParse({ ...input, expectedVersion: version }).success, true);
  assert.equal(deliverySettingsInputSchema.safeParse({ ...input, serviceableZones: { sameUnion: true }, expectedVersion: version }).success, false);
});

test("delivery inspection policy is bounded and closed-box safe", () => {
  const { key: _key, version, ...input } = settings;
  assert.equal(deliverySettingsInputSchema.safeParse({ ...input, expectedVersion: version }).success, true);
  assert.equal(deliverySettingsInputSchema.safeParse({ ...input, inspectionPolicy: { openBoxAllowed: false, inspectionMinutes: 5 }, expectedVersion: version }).success, false);
  assert.equal(deliverySettingsInputSchema.safeParse({ ...input, inspectionPolicy: { openBoxAllowed: true, inspectionMinutes: 31 }, expectedVersion: version }).success, false);
});

test("guest quotes accept a complete unsaved delivery location", () => {
  assert.equal(checkoutQuoteInputSchema.safeParse({ deliveryLocation: { division: "Dhaka", district: "Dhaka", upazila: "Savar", union: "Birulia" } }).success, true);
  assert.equal(checkoutQuoteInputSchema.safeParse({ deliveryLocation: { division: "Dhaka", district: "", upazila: "Savar", union: "Birulia" } }).success, false);
});

test("pickup points require a dispatch-ready local contact", () => {
  const point = { name: "Hnila Bazaar", phone: "01700000000", address: "Main road counter", division: "Chattogram", district: "Cox's Bazar", upazila: "Teknaf", unionName: "Hnila", instructions: "Bring order number", active: true };
  assert.equal(pickupPointInputSchema.safeParse(point).success, true);
  assert.equal(pickupPointInputSchema.safeParse({ ...point, phone: "123" }).success, false);
  assert.equal(pickupPointInputSchema.safeParse({ ...point, unionName: "" }).success, false);
});
