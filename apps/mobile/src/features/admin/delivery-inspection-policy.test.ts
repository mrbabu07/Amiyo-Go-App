import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const admin = readFileSync(new URL("./AdminDeliverySettingsScreen.tsx", import.meta.url), "utf8");
const seller = readFileSync(new URL("../orders/VendorOrderDetailScreen.tsx", import.meta.url), "utf8");
const customer = readFileSync(new URL("../orders/CustomerOrderDetailScreen.tsx", import.meta.url), "utf8");
const checkout = readFileSync(new URL("../commerce/CheckoutScreen.tsx", import.meta.url), "utf8");
const guestCheckout = readFileSync(new URL("../commerce/GuestCheckoutScreen.tsx", import.meta.url), "utf8");

test("admin controls and sellers see the delivery inspection policy", () => {
  assert.match(admin, /Allow open-box delivery/);
  assert.match(admin, /inspectionPolicy:/);
  assert.match(admin, /Closed-box delivery/);
  assert.match(admin, /Customer pickup points/);
  assert.match(admin, /createAdminPickupPoint/);
  assert.match(admin, /updateAdminPickupPoint/);
  assert.match(seller, /Parcel inspection/);
  assert.match(seller, /deliveryInspection\.openBoxAllowed/);
  assert.match(customer, /This promise was saved when you placed the order/);
  assert.match(checkout, /getDeliverySettings/);
  assert.match(guestCheckout, /getDeliverySettings/);
});
