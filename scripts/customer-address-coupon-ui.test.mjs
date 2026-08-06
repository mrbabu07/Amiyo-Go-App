import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("address management mirrors the reference add and edit workflow", async () => {
  const source = await read("../apps/mobile/src/features/account/AddressesScreen.tsx");
  for (const capability of ["My Addresses", "Add New Address", "Edit Address", "LocationSelect", "Upazila", "Union", "Area / Ward", "Postal Code", "Map Pin", "Set as default address", "Set Default", "Delete address?"]) assert.match(source, new RegExp(capability.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  for (const operation of ["createMyAddress", "updateMyAddress", "deleteMyAddress"]) assert.match(source, new RegExp(operation));
});

test("coupon can be applied in cart and carried into checkout", async () => {
  const [cart, checkout, input] = await Promise.all([read("../apps/mobile/src/features/commerce/CartScreen.tsx"), read("../apps/mobile/src/features/commerce/CheckoutScreen.tsx"), read("../apps/mobile/src/features/commerce/components/CouponInput.tsx")]);
  assert.match(cart, /couponCode=.*encodeURIComponent/);
  assert.match(checkout, /placeOrder\(user, \{ addressId, paymentMethod, couponCode \}/);
  for (const capability of ["Coupon or voucher code", "Coupon Applied", "You saved", "Only one coupon or voucher", "Remove"]) assert.match(input, new RegExp(capability));
});

test("checkout validates and persists authoritative coupon discounts", async () => {
  const [service, contract, seed] = await Promise.all([read("../apps/api/src/modules/commerce/commerce.service.ts"), read("../packages/contracts/src/commerce.ts"), read("../prisma/seed.ts")]);
  for (const capability of ["COUPON_INVALID", "COUPON_MINIMUM_SPEND", "COUPON_LIMIT_REACHED", "COUPON_USER_LIMIT_REACHED", "couponRedemption.create", "discountMinor: discount", "allocateDiscount"]) assert.match(service, new RegExp(capability.replace(".", "\\.")));
  assert.match(contract, /checkoutQuoteInputSchema/);
  assert.match(contract, /coupon: appliedCouponSchema\.nullable\(\)/);
  assert.match(seed, /code: "SAVE10"/);
});
