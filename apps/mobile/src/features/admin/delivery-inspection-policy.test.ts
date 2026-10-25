import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const admin = readFileSync(new URL("./AdminDeliverySettingsScreen.tsx", import.meta.url), "utf8");
const seller = readFileSync(new URL("../orders/VendorOrderDetailScreen.tsx", import.meta.url), "utf8");

test("admin controls and sellers see the delivery inspection policy", () => {
  assert.match(admin, /Allow open-box delivery/);
  assert.match(admin, /inspectionPolicy:/);
  assert.match(admin, /Closed-box delivery/);
  assert.match(seller, /Parcel inspection/);
  assert.match(seller, /deliveryInspection\.openBoxAllowed/);
});
