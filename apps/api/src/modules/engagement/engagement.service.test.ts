import assert from "node:assert/strict";
import test from "node:test";
import type { PrismaClient } from "@prisma/client";
import type { Session } from "@amiyo/contracts";
import { EngagementService } from "./engagement.service.js";

const userId = "11111111-1111-4111-8111-111111111111";
const threadId = "22222222-2222-4222-8222-222222222222";
const vendorId = "33333333-3333-4333-8333-333333333333";
const customer = { principal: { userId, roles: ["CUSTOMER"], vendorIds: [] }, status: "ACTIVE", email: null, phone: null, profile: { firstName: null, lastName: null, displayName: "Customer", avatarStorageKey: null, locale: "en", currency: "BDT" }, permissions: [], vendorMemberships: [] } as Session;
const seller = { ...customer, principal: { userId, roles: ["VENDOR_OWNER"], vendorIds: [vendorId] }, permissions: ["vendor:read", "support:manage"] } as Session;

test("starting seller chat reuses the customer's open vendor thread", async () => {
  let createCalls = 0;
  const client = { chatThread: { findFirst: async () => ({ id: threadId }), create: async () => { createCalls += 1; return { id: "new-thread" }; } } } as unknown as PrismaClient;
  const result = await new EngagementService(client).createThread(customer, { vendorId, subject: "Product question" });
  assert.equal(result.id, threadId);
  assert.equal(createCalls, 0);
});

test("seller chat requires an active seller participant", async () => {
  const client = { chatThread: { findFirst: async () => null }, vendor: { findFirst: async () => ({ id: vendorId, members: [] }) } } as unknown as PrismaClient;
  await assert.rejects(() => new EngagementService(client).createThread(customer, { vendorId, subject: "Product question" }), /not available for chat/);
});

test("chat thread read state remains participant scoped", async () => {
  let updatedUserId = "";
  const client = { chatParticipant: { updateMany: async ({ where }: { where: { userId: string } }) => { updatedUserId = where.userId; return { count: 1 }; } } } as unknown as PrismaClient;
  await new EngagementService(client).readThread(userId, threadId);
  assert.equal(updatedUserId, userId);
});

test("non-participants cannot mark a chat thread read", async () => {
  const client = { chatParticipant: { updateMany: async () => ({ count: 0 }) } } as unknown as PrismaClient;
  await assert.rejects(() => new EngagementService(client).readThread(userId, threadId), /Chat thread not found/);
});

test("thread listing returns unread messages since participant read time", async () => {
  const joinedAt = new Date("2026-08-01T00:00:00.000Z");
  const client = { chatThread: { findMany: async () => [{ id: threadId, vendorId: null, subject: "Help", status: "open", updatedAt: joinedAt, participants: [{ joinedAt, lastReadAt: null }], messages: [] }] }, chatMessage: { count: async () => 3 } } as unknown as PrismaClient;
  const [thread] = await new EngagementService(client).threads(userId);
  assert.equal(thread?.unreadCount, 3);
  assert.equal(thread?.lastReadAt, null);
});

test("wishlist sharing revocation remains scoped to the owner's list", async () => {
  let wishlistId = "";
  const client = { wishlist: { findFirst: async () => ({ id: "44444444-4444-4444-8444-444444444444" }), findUniqueOrThrow: async () => ({ id: "44444444-4444-4444-8444-444444444444", name: "My Wishlist", isDefault: true, share: null, items: [] }) }, sharedWishlist: { deleteMany: async ({ where }: { where: { wishlistId: string } }) => { wishlistId = where.wishlistId; } } } as unknown as PrismaClient;
  const result = await new EngagementService(client).unshareWishlist(userId);
  assert.equal(wishlistId, "44444444-4444-4444-8444-444444444444");
  assert.equal(result.shareUrl, null);
});

test("seller review replies are ownership scoped and audited", async () => {
  let reply = ""; let audited = false;
  const transaction = { review: { update: async ({ data }: { data: { vendorReply: string } }) => { reply = data.vendorReply; } }, auditLog: { create: async () => { audited = true; } } };
  const client = { review: { findFirst: async () => ({ id: "55555555-5555-4555-8555-555555555555" }), findMany: async () => [] }, $transaction: async (operation: (value: typeof transaction) => Promise<unknown>) => operation(transaction) } as unknown as PrismaClient;
  const result = await new EngagementService(client).replyToReview(seller, "55555555-5555-4555-8555-555555555555", { body: "Thank you for your feedback." });
  assert.equal(reply, "Thank you for your feedback."); assert.equal(audited, true); assert.deepEqual(result, []);
});

test("seller cannot reply to another shop review", async () => {
  const client = { review: { findFirst: async () => null } } as unknown as PrismaClient;
  await assert.rejects(() => new EngagementService(client).replyToReview(seller, "55555555-5555-4555-8555-555555555555", { body: "Reply" }), /not found for this seller/);
});
