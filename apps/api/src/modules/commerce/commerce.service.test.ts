import assert from "node:assert/strict";
import test from "node:test";
import type { PrismaClient } from "@prisma/client";
import type { Session } from "@amiyo/contracts";
import { cartDto, checkoutCartDisposition, CommerceService, selectedCart, shopVacationActive } from "./commerce.service.js";

const session = { principal: { userId: "11111111-1111-4111-8111-111111111111", roles: ["CUSTOMER"], vendorIds: [] }, status: "ACTIVE", email: null, phone: null, profile: { firstName: null, lastName: null, displayName: "Customer", avatarStorageKey: null, locale: "en", currency: "BDT" }, permissions: ["checkout:manage"], vendorMemberships: [] } as Session;
const checkout = { addressId: "22222222-2222-4222-8222-222222222222", paymentMethod: "SSLCOMMERZ" as const };

test("checkout rejects a payment method disabled by platform settings", async () => {
  const client = { platformConfiguration: { findUnique: async () => ({ maintenanceMode: { enabled: false }, paymentMethods: { cod: { enabled: true }, sslcommerz: { enabled: false }, bkashManual: { enabled: true } } }) } } as unknown as PrismaClient;
  await assert.rejects(() => new CommerceService(client).checkout(session, checkout, "checkout-key"), /not currently available/);
});

test("checkout rejects writes during platform maintenance", async () => {
  const client = { platformConfiguration: { findUnique: async () => ({ maintenanceMode: { enabled: true, message: "Scheduled maintenance is active" }, paymentMethods: { sslcommerz: { enabled: true } } }) } } as unknown as PrismaClient;
  await assert.rejects(() => new CommerceService(client).checkout(session, checkout, "checkout-key"), /Scheduled maintenance is active/);
});

test("checkout requires active-phone confirmation when village COD policy is enabled", async () => {
  const client = { platformConfiguration: { findUnique: async () => ({ maintenanceMode: { enabled: false }, paymentMethods: { cod: { enabled: true } }, villageOperations: { enabled: true, requireCodPhoneConfirmation: true } }) } } as unknown as PrismaClient;
  await assert.rejects(() => new CommerceService(client).checkout(session, { addressId: checkout.addressId, paymentMethod: "COD" }, "checkout-key"), /Confirm that the delivery phone number is active/);
});

test("checkout rejects pickup selection while the admin feature is disabled", async () => {
  const client = { platformConfiguration: { findUnique: async () => ({ maintenanceMode: { enabled: false }, paymentMethods: { cod: { enabled: true } }, villageOperations: { enabled: true, pickupPointsEnabled: false } }) } } as unknown as PrismaClient;
  await assert.rejects(() => new CommerceService(client).checkout(session, { addressId: checkout.addressId, pickupPointId: "33333333-3333-4333-8333-333333333333", paymentMethod: "COD", codPhoneConfirmed: true }, "checkout-key"), /pickup is currently unavailable/i);
});

test("shop vacation blocks only its active scheduled window", () => {
  const settings = { vacationMode: { enabled: true, startsAt: "2026-10-20T00:00:00.000Z", endsAt: "2026-10-22T00:00:00.000Z" } };
  assert.equal(shopVacationActive(settings, Date.parse("2026-10-21T12:00:00.000Z")), true);
  assert.equal(shopVacationActive(settings, Date.parse("2026-10-22T00:00:00.000Z")), false);
  assert.equal(shopVacationActive({ vacationMode: { ...settings.vacationMode, enabled: false } }, Date.parse("2026-10-21T12:00:00.000Z")), false);
});

test("cart response includes seller shop identity for package grouping", () => {
  const updatedAt = new Date("2026-10-26T08:00:00.000Z");
  const cart = cartDto({
    id: "cart-1",
    currency: "BDT",
    updatedAt,
    items: [{
      id: "item-1",
      productId: "product-1",
      variantId: "variant-1",
      quantity: 2,
      product: { name: "Village Rice", shop: { id: "shop-1", name: "Amiyo Village Store", slug: "amiyo-village-store" } },
      variant: { title: "5 kg", sku: "RICE-5KG", priceMinor: 85000n, currency: "BDT", inventory: { onHand: 12, reserved: 2 }, media: [] }
    }]
  } as unknown as Parameters<typeof cartDto>[0]);

  assert.deepEqual(cart.items[0] && {
    shopId: cart.items[0].shopId,
    shopName: cart.items[0].shopName,
    shopSlug: cart.items[0].shopSlug
  }, { shopId: "shop-1", shopName: "Amiyo Village Store", shopSlug: "amiyo-village-store" });
  assert.equal(cart.items[0]?.availableQuantity, 10);
});

test("checkout selection rejects stale IDs and keeps only explicitly selected cart lines", () => {
  const first = { id: "11111111-1111-4111-8111-111111111111" };
  const second = { id: "22222222-2222-4222-8222-222222222222" };
  const cart = { id: "cart-1", items: [first, second] } as unknown as Parameters<typeof selectedCart>[0];
  assert.deepEqual(selectedCart(cart, [second.id]).items.map((item) => item.id), [second.id]);
  assert.throws(() => selectedCart(cart, ["33333333-3333-4333-8333-333333333333"]), /selection changed/i);
  assert.deepEqual(checkoutCartDisposition(cart, selectedCart(cart, [second.id])), { convertCart: false, selectedItemIds: [second.id] });
  assert.deepEqual(checkoutCartDisposition(cart, cart), { convertCart: true, selectedItemIds: [first.id, second.id] });
});

test("moving a cart item writes the wishlist before deleting the owned cart line", async () => {
  const calls: string[] = [];
  const transaction = {
    cartItem: {
      findFirst: async () => ({ id: "22222222-2222-4222-8222-222222222222", productId: "33333333-3333-4333-8333-333333333333", cartId: "44444444-4444-4444-8444-444444444444" }),
      delete: async () => { calls.push("cart-delete"); }
    },
    wishlist: { findFirst: async () => ({ id: "55555555-5555-4555-8555-555555555555" }) },
    wishlistItem: { upsert: async () => { calls.push("wishlist-upsert"); } }
  };
  const client = {
    wishlist: { findFirst: async () => ({ id: "55555555-5555-4555-8555-555555555555" }) },
    $transaction: async (operation: (value: typeof transaction) => Promise<unknown>) => operation(transaction)
  } as unknown as PrismaClient;
  const service = new CommerceService(client);
  service.cart = async () => ({ id: "cart-after-move" }) as never;
  assert.deepEqual(await service.moveItemToWishlist("11111111-1111-4111-8111-111111111111", "22222222-2222-4222-8222-222222222222"), { id: "cart-after-move" });
  assert.deepEqual(calls, ["wishlist-upsert", "cart-delete"]);
});
