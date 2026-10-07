import assert from "node:assert/strict";
import test from "node:test";
import type { PrismaClient } from "@prisma/client";
import { wishlistCollectionInputSchema, wishlistSelectionSchema } from "@amiyo/contracts";
import { WishlistCollectionsService } from "./wishlist-collections.service.js";
import { EngagementService } from "./engagement.service.js";

const owner = "11111111-1111-4111-8111-111111111111";
const other = "22222222-2222-4222-8222-222222222222";
const id = "33333333-3333-4333-8333-333333333333";

test("collection summaries select only the owner's lists and safe counts", async () => {
  const client = { wishlist: { findMany: async ({ where }: { where: unknown }) => {
    assert.deepEqual(where, { userId: owner });
    return [{ id, name: "Gifts", isDefault: false, _count: { items: 3 } }];
  } } } as unknown as PrismaClient;
  assert.deepEqual(await new WishlistCollectionsService(client).list(owner), [{ id, name: "Gifts", isDefault: false, itemCount: 3 }]);
});

test("custom collection sharing and revocation never target the default list", async () => {
  let token = "";
  const client = { wishlist: {
    findFirst: async ({ where }: { where: unknown }) => { assert.deepEqual(where, { id, userId: owner }); return { id }; },
    findUniqueOrThrow: async () => ({ id, name: "Gifts", isDefault: false, share: token ? { shareToken: token, expiresAt: new Date(Date.now() + 60_000) } : null, items: [] })
  }, sharedWishlist: {
    upsert: async ({ where, create, update }: { where: unknown; create: { wishlistId: string; shareToken: string; expiresAt: Date }; update: { shareToken: string } }) => {
      assert.deepEqual(where, { wishlistId: id }); assert.equal(create.wishlistId, id);
      assert.ok(create.expiresAt > new Date()); assert.notEqual(create.shareToken, update.shareToken);
      token = create.shareToken;
    },
    deleteMany: async ({ where }: { where: unknown }) => { assert.deepEqual(where, { wishlistId: id }); token = ""; }
  } } as unknown as PrismaClient;
  const service = new EngagementService(client);
  assert.ok((await service.shareWishlist(owner, id)).shareUrl?.endsWith(token));
  assert.equal((await service.unshareWishlist(owner, id)).shareUrl, null);
});

test("collection names and selectors reject empty, oversized, foreign-field and malformed input", () => {
  assert.deepEqual(wishlistCollectionInputSchema.parse({ name: "  Birthday gifts  " }), { name: "Birthday gifts" });
  for (const input of [{ name: " " }, { name: "x".repeat(81) }, { name: "Gifts", userId: other }]) assert.equal(wishlistCollectionInputSchema.safeParse(input).success, false);
  assert.equal(wishlistSelectionSchema.safeParse({ collectionId: "not-an-id" }).success, false);
});

test("collection creation is owner-bound, private, trimmed and bounded inside a serializable transaction", async () => {
  let count = 19;
  const transaction = { wishlist: {
    count: async ({ where }: { where: { userId: string; isDefault: boolean } }) => { assert.deepEqual(where, { userId: owner, isDefault: false }); return count; },
    create: async ({ data }: { data: { userId: string; name: string; isDefault: boolean } }) => { assert.deepEqual(data, { userId: owner, name: "Gifts", isDefault: false }); return { id, ...data }; }
  } };
  const client = { $transaction: async (operation: (value: typeof transaction) => Promise<unknown>, options: { isolationLevel: string }) => { assert.equal(options.isolationLevel, "Serializable"); return operation(transaction); } } as unknown as PrismaClient;
  const service = new WishlistCollectionsService(client);
  assert.deepEqual(await service.create(owner, { name: " Gifts " }), { id, name: "Gifts", isDefault: false, itemCount: 0 });
  count = 20;
  await assert.rejects(service.create(owner, { name: "Gifts" }), /20 collections/);
});

test("rename/delete exclude other owners and the default list at the database predicate", async () => {
  let allowed = false;
  const client = { wishlist: {
    updateMany: async ({ where, data }: { where: unknown; data: unknown }) => { assert.deepEqual(where, { id, userId: owner, isDefault: false }); assert.deepEqual(data, { name: "New name" }); return { count: Number(allowed) }; },
    deleteMany: async ({ where }: { where: unknown }) => { assert.deepEqual(where, { id, userId: owner, isDefault: false }); return { count: Number(allowed) }; }
  } } as unknown as PrismaClient;
  const service = new WishlistCollectionsService(client);
  await assert.rejects(service.rename(owner, id, { name: "New name" }), /not found/);
  await assert.rejects(service.remove(owner, id), /not found/);
  allowed = true;
  await service.rename(owner, id, { name: "New name" });
  await service.remove(owner, id);
});

test("foreign collection read/add/remove/share/revoke all fail before data access or writes", async () => {
  const client = { wishlist: { findFirst: async ({ where }: { where: unknown }) => { assert.deepEqual(where, { id, userId: other }); return null; } } } as unknown as PrismaClient;
  const service = new EngagementService(client);
  for (const operation of [
    () => service.wishlist(other, id),
    () => service.addWishlistItem(other, owner, id),
    () => service.removeWishlistItem(other, owner, id),
    () => service.shareWishlist(other, id),
    () => service.unshareWishlist(other, id)
  ]) await assert.rejects(operation(), /collection not found/);
});

test("removing from a custom collection leaves the default and other collections untouched", async () => {
  const client = { wishlist: {
    findFirst: async () => ({ id, userId: owner }),
    findUniqueOrThrow: async () => ({ id, name: "Gifts", isDefault: false, share: null, items: [] })
  }, wishlistItem: { deleteMany: async ({ where }: { where: unknown }) => { assert.deepEqual(where, { wishlistId: id, productId: other }); return { count: 1 }; } } } as unknown as PrismaClient;
  const result = await new EngagementService(client).removeWishlistItem(owner, other, id);
  assert.equal(result.id, id);
  assert.equal(result.isDefault, false);
});
