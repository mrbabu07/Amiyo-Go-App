import assert from "node:assert/strict";
import test from "node:test";
import type { PrismaClient } from "@prisma/client";
import { CatalogService, shopServicePromise } from "./catalog.service.js";

test("shop service promise does not invent a response score without evidence", () => {
  assert.deepEqual(shopServicePromise(0, 0), { questionCount: 0, qnaResponseRate: null });
  assert.deepEqual(shopServicePromise(3, 2), { questionCount: 3, qnaResponseRate: 67 });
});

test("public shop projection exposes bounded decoration without operational settings", async () => {
  const client = { vendorShop: { findMany: async () => [{ id: "11111111-1111-4111-8111-111111111111", vendorId: "22222222-2222-4222-8222-222222222222", name: "Village Store", slug: "village-store", description: null, logoStorageKey: null, bannerStorageKey: null, version: 1, createdAt: new Date(), settings: { phone: "01700000000", pickupAddress: { address: "Private pickup address" }, storefront: { tagline: "  Fresh every day  ", announcement: "A".repeat(220), trustMessage: "Local verified seller" } }, _count: { products: 2, followers: 7 } }] } } as unknown as PrismaClient;
  const result = await new CatalogService(client).shops(undefined, 17);
  assert.deepEqual(result.data[0]?.storefront, { tagline: "Fresh every day", announcement: "A".repeat(180), trustMessage: "Local verified seller", vacation: null });
  assert.equal("settings" in result.data[0]!, false);
  assert.equal(result.data[0]?.followerCount, 7);
  assert.doesNotMatch(JSON.stringify(result), /Private pickup address|01700000000/);
});

test("public shop exposes only an active buyer-safe vacation message", async () => {
  const client = { vendorShop: { findMany: async () => [{ id: "11111111-1111-4111-8111-111111111111", vendorId: "22222222-2222-4222-8222-222222222222", name: "Village Store", slug: "village-store", description: null, logoStorageKey: null, bannerStorageKey: null, version: 1, createdAt: new Date(), settings: { vacationMode: { enabled: true, startsAt: "2020-01-01T00:00:00.000Z", endsAt: "2099-01-01T00:00:00.000Z", reason: "Private reason", buyerMessage: "Back soon" } }, _count: { products: 0, followers: 0 } }] } } as unknown as PrismaClient;
  const result = await new CatalogService(client).shops(undefined, 10);
  assert.equal(result.data[0]?.storefront?.vacation?.buyerMessage, "Back soon");
  assert.doesNotMatch(JSON.stringify(result), /Private reason/);
});

test("shop follow is idempotent and scoped to the signed-in customer", async () => {
  const shopId = "11111111-1111-4111-8111-111111111111";
  const userId = "33333333-3333-4333-8333-333333333333";
  let upsert: unknown;
  let removed: unknown;
  const client = { vendorShop: { findFirst: async () => ({ id: shopId }) }, shopFollow: { upsert: async (input: unknown) => { upsert = input; }, deleteMany: async (input: unknown) => { removed = input; }, count: async () => 12 } } as unknown as PrismaClient;
  const session = { principal: { userId } } as never;
  const followed = await new CatalogService(client).followShop(session, "village-store");
  assert.deepEqual(upsert, { where: { userId_shopId: { userId, shopId } }, create: { userId, shopId }, update: {} });
  assert.deepEqual(followed, { shopId, following: true, followerCount: 12 });
  const unfollowed = await new CatalogService(client).unfollowShop(session, shopId);
  assert.deepEqual(removed, { where: { userId, shopId } });
  assert.deepEqual(unfollowed, { shopId, following: false, followerCount: 12 });
});

test("followed shop library returns only active shops for the current account", async () => {
  const userId = "33333333-3333-4333-8333-333333333333";
  let query: any;
  const shop = { id: "11111111-1111-4111-8111-111111111111", vendorId: "22222222-2222-4222-8222-222222222222", name: "Village Store", slug: "village-store", description: null, logoStorageKey: null, bannerStorageKey: null, version: 1, settings: null, _count: { products: 3, followers: 8 } };
  const client = { shopFollow: { findMany: async (input: unknown) => { query = input; return [{ shop }]; } } } as unknown as PrismaClient;
  const result = await new CatalogService(client).followedShops({ principal: { userId } } as never);
  assert.equal(query.where.userId, userId);
  assert.equal(query.where.shop.status, "ACTIVE");
  assert.equal(result[0]?.followerCount, 8);
});
