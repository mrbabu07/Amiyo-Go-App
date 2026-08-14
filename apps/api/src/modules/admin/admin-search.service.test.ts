import assert from "node:assert/strict";
import test from "node:test";
import type { PrismaClient } from "@prisma/client";
import type { Session } from "@amiyo/contracts";
import { AdminSearchService } from "./admin-search.service.js";

const session: Session = { principal: { userId: "22222222-2222-4222-8222-222222222222", roles: ["SUPER_ADMIN"], vendorIds: [] }, status: "ACTIVE", email: "admin@amiyo.test", phone: null, profile: { firstName: "Admin", lastName: null, displayName: "Admin", avatarStorageKey: null, locale: "en", currency: "BDT" }, permissions: ["admin:read", "admin:manage"], vendorMemberships: [] };

test("admin search formats live resource results", async () => {
  const client = { $queryRaw: async () => [{ id: "11111111-1111-4111-8111-111111111111", title: "AG-1001", subtitle: "Demo customer - BDT 500.00", status: "CONFIRMED", createdAt: new Date("2026-08-14T10:00:00Z"), updatedAt: new Date("2026-08-14T11:00:00Z") }] } as unknown as PrismaClient;
  const result = await new AdminSearchService(client).search(session, "AG-1001", ["order"], 5, 10);
  assert.equal(result.total, 1);
  assert.equal(result.results[0]?.href, "/admin/orders/11111111-1111-4111-8111-111111111111");
  assert.equal(result.results[0]?.type, "order");
  assert.equal(result.results[0]?.meta.createdAt, "2026-08-14");
});

test("admin search rejects sessions without admin read permission", async () => {
  const customer = { ...session, principal: { ...session.principal, roles: ["CUSTOMER" as const] }, permissions: [] };
  await assert.rejects(() => new AdminSearchService({} as PrismaClient).search(customer, "demo"), /Admin search access is required/);
});
