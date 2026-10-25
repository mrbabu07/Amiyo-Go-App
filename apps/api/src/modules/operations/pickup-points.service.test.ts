import assert from "node:assert/strict";
import test from "node:test";
import type { PrismaClient } from "@prisma/client";
import type { Session } from "@amiyo/contracts";
import { OperationsService } from "./operations.service.js";

const session: Session = { principal: { userId: "22222222-2222-4222-8222-222222222222", roles: ["SUPER_ADMIN"], vendorIds: [] }, status: "ACTIVE", email: "admin@amiyo.test", phone: null, profile: { firstName: null, lastName: null, displayName: "Admin", avatarStorageKey: null, locale: "en", currency: "BDT" }, permissions: ["settings:manage"], vendorMemberships: [] };
const point = { id: "11111111-1111-4111-8111-111111111111", name: "Hnila Bazaar", phone: "01700000000", address: "Main road counter", division: "Chattogram", district: "Cox's Bazar", upazila: "Teknaf", unionName: "Hnila", instructions: "Bring order number", active: true, version: 1, createdAt: new Date(), updatedAt: new Date() };

test("public pickup points expose only active counters in stable area order", async () => {
  let where: unknown;
  const client = { pickupPoint: { findMany: async (input: { where: unknown }) => { where = input.where; return [point]; } } } as unknown as PrismaClient;
  const service = new OperationsService(client);
  const rows = await service.pickupPoints();
  assert.deepEqual(where, { active: true });
  assert.equal(rows[0]?.name, "Hnila Bazaar");
  await assert.rejects(() => service.adminPickupPoints({ ...session, permissions: [] }), /cannot perform/);
});

test("pickup point updates require current version and create audit evidence", async () => {
  const audits: unknown[] = [];
  const client = { pickupPoint: { findUnique: async () => point, update: async ({ data }: { data: { active: boolean } }) => ({ ...point, active: data.active, version: 2 }) }, auditLog: { create: async ({ data }: { data: unknown }) => { audits.push(data); } } } as unknown as PrismaClient;
  const updated = await new OperationsService(client).updatePickupPoint(session, point.id, { ...point, instructions: point.instructions, active: false, expectedVersion: 1 });
  assert.equal(updated.active, false);
  assert.equal(updated.version, 2);
  assert.equal(audits.length, 1);
  await assert.rejects(() => new OperationsService(client).updatePickupPoint(session, point.id, { ...point, instructions: point.instructions, active: false, expectedVersion: 2 }), /changed; refresh/);
});
