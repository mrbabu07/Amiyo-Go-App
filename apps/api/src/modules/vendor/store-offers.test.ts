import assert from "node:assert/strict";
import test from "node:test";
import type { VendorShop, Voucher } from "@prisma/client";
import { publicStoreOffer } from "./store-offers.js";

test("vendor voucher projects only to its selected active storefront shape", () => {
  const voucher = { id: "11111111-1111-4111-8111-111111111111", code: "SHOP20", ownerType: "vendor", ownerId: "22222222-2222-4222-8222-222222222222", active: true, startsAt: new Date("2026-10-01T00:00:00.000Z"), endsAt: new Date("2026-11-01T00:00:00.000Z"), version: 1, rules: { shopId: "33333333-3333-4333-8333-333333333333", title: "Village mega offer", subtitle: "This week only", discountType: "PERCENT", value: 20, ctaLabel: "Shop now", showOnHome: true, showOnShop: true, showAsPopup: true } } as Voucher;
  const shop = { id: "33333333-3333-4333-8333-333333333333", name: "Village Store", slug: "village-store" } as VendorShop;
  const offer = publicStoreOffer(voucher, shop);
  assert.equal(offer?.href, "/shop/village-store");
  assert.equal(offer?.code, "SHOP20");
  assert.equal(offer?.showAsPopup, true);
});

test("vendor voucher cannot leak onto a different shop", () => {
  const voucher = { id: "11111111-1111-4111-8111-111111111111", code: "OTHER100", ownerType: "vendor", ownerId: "33333333-3333-4333-8333-333333333333", active: true, startsAt: new Date("2026-10-01T00:00:00.000Z"), endsAt: new Date("2026-11-01T00:00:00.000Z"), version: 1, rules: { shopId: "11111111-1111-4111-8111-111111111111", title: "Offer", discountType: "FIXED", value: 100 } } as Voucher;
  const shop = { id: "22222222-2222-4222-8222-222222222222", name: "Other", slug: "other" } as VendorShop;
  assert.equal(publicStoreOffer(voucher, shop), null);
});
