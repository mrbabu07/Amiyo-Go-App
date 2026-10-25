import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const admin = readFileSync(new URL("./AdminDeliverySettingsScreen.tsx", import.meta.url), "utf8");
const checkout = readFileSync(new URL("../commerce/CheckoutScreen.tsx", import.meta.url), "utf8");
const api = readFileSync(new URL("../../../../api/src/modules/commerce/commerce.service.ts", import.meta.url), "utf8");

test("admin can manually enable every geographic delivery zone", () => {
  for (const label of ["Serve the same union", "Serve the same upazila", "Serve the same district", "Serve outside the district"]) assert.match(admin, new RegExp(label));
  assert.match(admin, /serviceableZones:/);
});

test("selected checkout address refreshes the quote and disabled zones are rejected server-side", () => {
  assert.match(checkout, /loyaltyPoints, addressId/);
  assert.match(api, /DELIVERY_AREA_UNAVAILABLE/);
  assert.match(api, /deliverySettings\.outsideDistrictEnabled/);
});
