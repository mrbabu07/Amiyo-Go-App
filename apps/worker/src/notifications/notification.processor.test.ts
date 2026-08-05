import assert from "node:assert/strict";
import test from "node:test";
import type { PrismaClient } from "@prisma/client";
import type { Job } from "bullmq";
import { createNotificationProcessor } from "./notification.processor.js";

test("push processor records delivery after provider acceptance", async () => { let status = ""; let sent = 0; const client = { notificationDelivery: { findUnique: async () => ({ id: "delivery-1", channel: "push", status: "PENDING", notification: { userId: "user-1", title: "Hello", body: "World", data: { href: "/" } } }), update: async ({ data }: { data: { status: string } }) => { status = data.status; } }, pushToken: { findMany: async () => [{ token: "ExponentPushToken[test]" }] } } as unknown as PrismaClient; const processor = createNotificationProcessor(client, { send: async (messages) => { sent = messages.length; } }); await processor({ data: { notificationDeliveryId: "11111111-1111-4111-8111-111111111111" } } as Job); assert.equal(sent, 1); assert.equal(status, "DELIVERED"); });
