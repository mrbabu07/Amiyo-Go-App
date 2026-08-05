import assert from "node:assert/strict";
import test from "node:test";
import type { PrismaClient } from "@prisma/client";
import type { Job } from "bullmq";
import { createNewsletterProcessor } from "./newsletter.processor.js";

test("newsletter processor sends once and stores provider reference", async () => {
  const deliveryUpdates: Array<Record<string, unknown>> = [];
  const client = { newsletterDelivery: { findUnique: async () => ({ id: "delivery-1", broadcastId: "broadcast-1", email: "buyer@example.com", status: "pending", subscriber: { active: true, unsubscribeToken: "11111111-1111-4111-8111-111111111111" }, broadcast: { subject: "Deals", previewText: "Today", body: "Save now" } }), update: async ({ data }: { data: Record<string, unknown> }) => { deliveryUpdates.push(data); }, count: async ({ where }: { where: { status: string | { in: string[] } } }) => typeof where.status === "string" && where.status === "sent" ? 1 : 0 }, newsletterBroadcast: { findUniqueOrThrow: async () => ({ recipientCount: 1 }), update: async () => undefined } } as unknown as PrismaClient;
  let sentTo = "";
  const processor = createNewsletterProcessor(client, { name: "test", send: async (message) => { sentTo = message.to; return { id: "provider-1" }; } }, "https://api.example.com");
  await processor({ data: { newsletterDeliveryId: "22222222-2222-4222-8222-222222222222" } } as Job);
  assert.equal(sentTo, "buyer@example.com");
  assert.equal(deliveryUpdates[0]?.status, "sent");
  assert.equal(deliveryUpdates[0]?.providerRef, "provider-1");
});
