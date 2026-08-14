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

test("RTO requires an active or failed shipment and records its resolution", async () => {
  const resolutions: string[] = [];
  const client = {
    shipment: {
      findUnique: async () => ({ id: shipmentId, status: "FAILED", provider: "Manual", assignment: null }),
      update: async ({ data }: { data: { status: string } }) => ({ id: shipmentId, status: data.status })
    },
    failedDeliveryRecord: { upsert: async ({ create }: { create: { resolution: string } }) => { resolutions.push(create.resolution); return create; } },
    auditLog: { create: async () => undefined }
  } as unknown as PrismaClient;
  const row = await new LogisticsService(client).markRto(session, shipmentId, { note: "Courier is returning the parcel" });
  assert.equal(row.status, "CANCELLED");
  assert.deepEqual(resolutions, ["rto_in_transit"]);
});

test("manifest pickup rejects parcels that are not ready", async () => {
  const client = { shipment: { findMany: async () => [{ id: shipmentId, status: "IN_TRANSIT" }] } } as unknown as PrismaClient;
  await assert.rejects(() => new LogisticsService(client).confirmManifestPickup(session, "manifest-1", { shipmentIds: [shipmentId], note: "Courier pickup confirmed" }), /must be ready to ship/);
});

test("reverse logistics inspection preserves evidence and advances status", async () => {
  const returnId = "33333333-3333-4333-8333-333333333333";
  let metadata: unknown;
  const client = {
    return: {
      findUnique: async () => ({ id: returnId, status: "RECEIVED" }),
      update: async ({ data }: { data: { status: string; events: { create: { metadata: unknown } } } }) => { metadata = data.events.create.metadata; return { id: returnId, status: data.status, requestedMinor: 1000n, approvedMinor: 1000n, createdAt: new Date("2026-08-14T00:00:00Z"), updatedAt: new Date("2026-08-14T00:00:00Z") }; }
    },
    auditLog: { create: async () => undefined }
  } as unknown as PrismaClient;
  const row = await new LogisticsService(client).reverseReturnAction(session, returnId, "inspected", { note: "Warehouse inspection completed", trackingNumber: null, pickupAt: null, inspection: { condition: "sellable" } });
  assert.equal(row.status, "INSPECTED");
  assert.deepEqual(metadata, { logisticsState: "inspected", trackingNumber: null, pickupAt: null, inspection: { condition: "sellable" } });
});

test("COD remittance requires reference and follows the shipment state machine", async () => {
  const client = { shipment: { findUnique: async () => ({ id: shipmentId, status: "DELIVERED", codState: "cod_collected", codRemittanceReference: null }), update: async ({ data }: { data: { codState: string; codRemittanceReference: string } }) => ({ id: shipmentId, ...data }) }, auditLog: { create: async () => undefined } } as unknown as PrismaClient;
  const service = new LogisticsService(client);
  await assert.rejects(() => service.updateCodState(session, shipmentId, "cod_remitted", { reference: null, reason: null, note: "Courier remittance received" }), /reference is required/);
  const row = await service.updateCodState(session, shipmentId, "cod_remitted", { reference: "REM-100", reason: null, note: "Courier remittance received" });
  assert.equal(row.codState, "cod_remitted");
  assert.equal(row.codRemittanceReference, "REM-100");
});
