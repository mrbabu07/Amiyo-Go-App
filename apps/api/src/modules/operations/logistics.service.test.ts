import assert from "node:assert/strict";
import test from "node:test";
import type { PrismaClient } from "@prisma/client";
import type { Session } from "@amiyo/contracts";
import { LogisticsService } from "./logistics.service.js";

const shipmentId = "11111111-1111-4111-8111-111111111111";
const session: Session = { principal: { userId: "22222222-2222-4222-8222-222222222222", roles: ["OPERATIONS_ADMIN"], vendorIds: [] }, status: "ACTIVE", email: null, phone: null, profile: { firstName: null, lastName: null, displayName: "Operator", avatarStorageKey: null, locale: "en", currency: "BDT" }, permissions: ["admin:read", "admin:manage"], vendorMemberships: [] };

test("logistics shipment transition records event and audit", async () => {
  const calls: string[] = [];
  const client = {
    shipment: {
      findUnique: async () => ({ id: shipmentId, status: "READY_TO_SHIP" }),
      update: async ({ data }: { data: { status: string; events: unknown } }) => { calls.push("shipment"); assert.equal(data.status, "PICKED_UP"); assert.ok(data.events); return { id: shipmentId, status: "PICKED_UP" }; }
    },
    auditLog: { create: async () => { calls.push("audit"); } }
  } as unknown as PrismaClient;
  const result = await new LogisticsService(client).transitionShipment(session, shipmentId, { status: "PICKED_UP", note: "Courier confirmed pickup" });
  assert.equal(result.status, "PICKED_UP");
  assert.deepEqual(calls, ["shipment", "audit"]);
});

test("logistics management rejects non-operations admins", async () => {
  const finance = { ...session, principal: { ...session.principal, roles: ["FINANCE_ADMIN" as const] } };
  await assert.rejects(() => new LogisticsService({} as PrismaClient).saveZone(finance, { name: "Dhaka", code: "DHAKA", districts: [], courierPartnerIds: [], defaultCourierName: null, codAvailable: true, status: "active", slaHours: 24, sortOrder: 10, notes: null }), /operations administrator access/);
});
