import assert from "node:assert/strict";
import test from "node:test";
import type { PrismaClient } from "@prisma/client";
import type { Session } from "@amiyo/contracts";
import { EngagementService } from "./engagement.service.js";

const adminId = "11111111-1111-4111-8111-111111111111";
const recipientId = "22222222-2222-4222-8222-222222222222";
const broadcastId = "33333333-3333-4333-8333-333333333333";
const admin = { principal: { userId: adminId, roles: ["SUPER_ADMIN"], vendorIds: [] }, status: "ACTIVE", email: "admin@amiyo.test", phone: null, profile: { firstName: null, lastName: null, displayName: "Admin", avatarStorageKey: null, locale: "en", currency: "BDT" }, permissions: ["admin:manage"], vendorMemberships: [] } as Session;

test("admin broadcast scopes customers and queues only push delivery", async () => {
  let roleFilter: unknown;
  let auditAfter: unknown;
  const client = {
    auditLog: {
      findFirst: async () => null,
      findMany: async () => [{ resourceId: broadcastId, actorUserId: adminId, createdAt: new Date("2026-10-19T00:00:00Z"), after: auditAfter }]
    },
    user: { findMany: async ({ where }: { where: { roles?: unknown } }) => { roleFilter = where.roles; return [{ id: recipientId }]; } },
    $transaction: async (work: (transaction: unknown) => Promise<unknown>) => work({
      notification: { upsert: async ({ create }: { create: { deliveries: { create: Array<{ channel: string; status: string }> } } }) => ({ deliveries: create.deliveries.create.map((delivery, index) => ({ ...delivery, id: `delivery-${index}` })) }) },
      outboxEvent: { upsert: async ({ create }: { create: { eventType: string } }) => { assert.equal(create.eventType, "notification.delivery.requested"); } },
      auditLog: { create: async ({ data }: { data: { after: unknown } }) => { auditAfter = data.after; } }
    })
  } as unknown as PrismaClient;
  const result = await new EngagementService(client).createAdminNotificationBroadcast(admin, { idempotencyKey: broadcastId, audience: "customers", title: "Order update", body: "Your marketplace order is ready.", href: "/orders", channels: ["in_app", "push"] });
  assert.deepEqual(roleFilter, { some: { role: { name: { in: ["CUSTOMER"] } } } });
  assert.equal(result.broadcasts[0]?.recipientCount, 1);
  assert.deepEqual(result.broadcasts[0]?.channels, ["in_app", "push"]);
});

test("admin broadcast rejects callers without management permission", async () => {
  const service = new EngagementService({} as PrismaClient);
  await assert.rejects(service.createAdminNotificationBroadcast({ ...admin, permissions: [] }, { idempotencyKey: broadcastId, audience: "all", title: "Notice", body: "Marketplace notice", channels: ["in_app"] }), /Admin management access/);
});
