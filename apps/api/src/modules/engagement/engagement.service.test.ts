import assert from "node:assert/strict";
import test from "node:test";
import type { PrismaClient } from "@prisma/client";
import { EngagementService } from "./engagement.service.js";

const userId = "11111111-1111-4111-8111-111111111111";
const threadId = "22222222-2222-4222-8222-222222222222";

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
