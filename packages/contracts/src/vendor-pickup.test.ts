import assert from "node:assert/strict";
import test from "node:test";
import { updateVendorShopSchema, vendorPickupAddressSchema } from "./vendor.js";

const pickupAddress = { name: "Seller Shop", phone: "01700000000", address: "Road 1, Savar", division: "Dhaka", district: "Dhaka", upazila: "Savar", union: "" };

test("seller pickup address requires a dispatch-ready Bangladesh contact", () => {
  assert.equal(vendorPickupAddressSchema.safeParse(pickupAddress).success, true);
  assert.equal(vendorPickupAddressSchema.safeParse({ ...pickupAddress, phone: "123" }).success, false);
  assert.equal(vendorPickupAddressSchema.safeParse({ ...pickupAddress, address: "" }).success, false);
});

test("shop settings reject malformed pickup snapshots without blocking unrelated settings", () => {
  assert.equal(updateVendorShopSchema.safeParse({ version: 1, settings: { pickupAddress } }).success, true);
  assert.equal(updateVendorShopSchema.safeParse({ version: 1, settings: { pickupAddress: { ...pickupAddress, upazila: "" } } }).success, false);
  assert.equal(updateVendorShopSchema.safeParse({ version: 1, settings: { storefront: { tagline: "Local seller" } } }).success, true);
});
