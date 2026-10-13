import assert from "node:assert/strict";
import test from "node:test";
import type { PrismaClient } from "@prisma/client";
import type { Session } from "@amiyo/contracts";
import { LogisticsService, logisticsShipmentDto } from "./logistics.service.js";

const shipmentId = "11111111-1111-4111-8111-111111111111";
const session: Session = { principal: { userId: "22222222-2222-4222-8222-222222222222", roles: ["OPERATIONS_ADMIN"], vendorIds: [] }, status: "ACTIVE", email: null, phone: null, profile: { firstName: null, lastName: null, displayName: "Operator", avatarStorageKey: null, locale: "en", currency: "BDT" }, permissions: ["admin:read", "admin:manage"], vendorMemberships: [] };
function transactional<T extends object>(client: T) { return Object.assign(client, { $transaction: async (operation: (transaction: T) => Promise<unknown>) => operation(client) }); }

test("logistics shipment transition records event and audit", async () => {
  const calls: string[] = [];
  const client = transactional({
    shipment: {
      findUnique: async () => ({ id: shipmentId, status: "READY_TO_SHIP", assignment: { version: 2, courierPartnerId: shipmentId, pickupStaffId: null, courierPartner: { status: "active" }, pickupStaff: null } }),
      update: async ({ data }: { data: { status: string; events: unknown } }) => { calls.push("shipment"); assert.equal(data.status, "PICKED_UP"); assert.ok(data.events); return { id: shipmentId, status: "PICKED_UP" }; }
    },
    auditLog: { create: async () => { calls.push("audit"); } }
  }) as unknown as PrismaClient;
  const result = await new LogisticsService(client).transitionShipment(session, shipmentId, { status: "PICKED_UP", note: "Courier confirmed pickup", expectedAssignmentVersion: 2 });
  assert.equal(result.status, "PICKED_UP");
  assert.deepEqual(calls, ["shipment", "audit"]);
});

test("shipment transition rejects missing and stale assignments without writes", async () => {
  let writes = 0;
  const unassigned = transactional({ shipment: { findUnique: async () => ({ id: shipmentId, status: "READY_TO_SHIP", assignment: null }), update: async () => { writes++; } } }) as unknown as PrismaClient;
  await assert.rejects(() => new LogisticsService(unassigned).transitionShipment(session, shipmentId, { status: "PICKED_UP", note: "Pickup confirmed", expectedAssignmentVersion: null }), /Assign an active courier/);
  const stale = transactional({ shipment: { findUnique: async () => ({ id: shipmentId, status: "READY_TO_SHIP", assignment: { version: 3, courierPartnerId: shipmentId, pickupStaffId: null, courierPartner: { status: "active" }, pickupStaff: null } }), update: async () => { writes++; } } }) as unknown as PrismaClient;
  await assert.rejects(() => new LogisticsService(stale).transitionShipment(session, shipmentId, { status: "PICKED_UP", note: "Pickup confirmed", expectedAssignmentVersion: 2 }), /changed; refresh and retry/);
  assert.equal(writes, 0);
});

test("courier assignment rejects stale versions before changing the parcel", async () => {
  let writes = 0;
  const client = transactional({ shipment: { findUnique: async () => ({ id: shipmentId, status: "READY_TO_SHIP", provider: null, trackingNumber: null, assignment: { version: 3 } }), update: async () => { writes++; } }, logisticsAssignment: { upsert: async () => { writes++; } } }) as unknown as PrismaClient;
  await assert.rejects(() => new LogisticsService(client).assignShipment(session, shipmentId, { courierPartnerId: shipmentId, pickupStaffId: null, bookingMode: "manual", trackingNumber: null, pickupDate: null, pickupWindow: null, estimatedDeliveryDate: null, note: null, expectedVersion: 2 }), /changed; refresh and retry/);
  assert.equal(writes, 0);
});

test("courier assignment rejects terminal parcels and inactive resources", async () => {
  const input = { courierPartnerId: shipmentId, pickupStaffId: null, bookingMode: "manual" as const, trackingNumber: null, pickupDate: null, pickupWindow: null, estimatedDeliveryDate: null, note: null, expectedVersion: null };
  const terminal = transactional({ shipment: { findUnique: async () => ({ id: shipmentId, status: "DELIVERED", assignment: null }) } }) as unknown as PrismaClient;
  await assert.rejects(() => new LogisticsService(terminal).assignShipment(session, shipmentId, input), /Cannot assign a delivered parcel/);
  let writes = 0;
  const inactive = transactional({
    shipment: { findUnique: async () => ({ id: shipmentId, status: "READY_TO_SHIP", provider: null, trackingNumber: null, assignment: null }), update: async () => { writes++; } },
    courierPartner: { findFirst: async () => null },
    logisticsAssignment: { upsert: async () => { writes++; } }
  }) as unknown as PrismaClient;
  await assert.rejects(() => new LogisticsService(inactive).assignShipment(session, shipmentId, input), /selected courier is not active/);
  assert.equal(writes, 0);
});

test("existing courier assignment requires an explicit current version", async () => {
  const client = transactional({ shipment: { findUnique: async () => ({ id: shipmentId, status: "READY_TO_SHIP", assignment: { version: 4 } }) } }) as unknown as PrismaClient;
  await assert.rejects(() => new LogisticsService(client).assignShipment(session, shipmentId, { courierPartnerId: shipmentId, pickupStaffId: null, bookingMode: "manual", trackingNumber: null, pickupDate: null, pickupWindow: null, estimatedDeliveryDate: null, note: null, expectedVersion: null }), /Refresh this parcel/);
});

test("courier assignment commits assignment, parcel projection and audit in one transaction", async () => {
  const calls: string[] = [];
  const client = transactional({
    shipment: {
      findUnique: async () => ({ id: shipmentId, status: "READY_TO_SHIP", provider: null, trackingNumber: null, assignment: null }),
      update: async ({ data }: { data: { provider: string; trackingNumber: string } }) => { calls.push("shipment"); assert.equal(data.provider, "manual-courier"); assert.equal(data.trackingNumber, "TRACK-1"); }
    },
    courierPartner: { findFirst: async () => ({ id: shipmentId, status: "active" }) },
    logisticsAssignment: { upsert: async () => { calls.push("assignment"); return { id: "assignment", version: 1, courierPartner: { provider: "manual-courier" }, pickupStaff: null }; } },
    auditLog: { create: async ({ data }: { data: { action: string } }) => { calls.push("audit"); assert.equal(data.action, "logistics.shipment.assigned"); } }
  }) as unknown as PrismaClient;
  const result = await new LogisticsService(client).assignShipment(session, shipmentId, { courierPartnerId: shipmentId, pickupStaffId: null, bookingMode: "manual", trackingNumber: "TRACK-1", pickupDate: null, pickupWindow: null, estimatedDeliveryDate: null, note: null, expectedVersion: null });
  assert.equal(result.version, 1);
  assert.deepEqual(calls, ["assignment", "shipment", "audit"]);
});

test("logistics management rejects non-operations admins", async () => {
  const finance = { ...session, principal: { ...session.principal, roles: ["FINANCE_ADMIN" as const] } };
  await assert.rejects(() => new LogisticsService({} as PrismaClient).saveZone(finance, { name: "Dhaka", code: "DHAKA", districts: [], courierPartnerIds: [], defaultCourierName: null, codAvailable: true, status: "active", slaHours: 24, sortOrder: 10, notes: null }), /operations administrator access/);
});

test("operations exception queue includes courier failures and seller-reported issues", async () => {
  const client = { shipment: { findMany: async ({ where }: { where: unknown }) => { assert.deepEqual(where, { OR: [{ status: "FAILED" }, { failedDelivery: { resolution: "vendor_reported" } }] }); return []; } } } as unknown as PrismaClient;
  assert.deepEqual(await new LogisticsService(client).failedDeliveries(session), []);
});

test("exception evidence derives owner, persisted SLA and exact finance exposure", () => {
  const now = new Date("2026-10-13T12:00:00.000Z");
  const row = {
    id: shipmentId, vendorOrderId: "package", status: "FAILED", provider: "courier", trackingNumber: "TRACK", codState: "cod_collected", codRemittanceReference: null, codDisputeReason: null, rtoReceivedAt: null, shippedAt: now, deliveredAt: null, createdAt: now, updatedAt: now,
    vendorOrder: { orderId: "order", vendorId: "vendor", totalMinor: 10000n, vendor: { displayName: "Seller" }, shop: { name: "Shop" }, order: { orderNumber: "AG-1", currency: "BDT", addresses: [], payments: [{ method: "COD" }] } },
    assignment: { pickupStaff: { name: "Rider Rahim" }, courierPartner: null, estimatedDeliveryDate: new Date("2026-10-13T10:00:00.000Z"), pickupDate: null, createdAt: now, updatedAt: now },
    failedDelivery: { reason: "Customer unavailable", attemptCount: 2, nextAttemptAt: null, redeliveryFeeMinor: 500n, returnFeeMinor: 200n, createdAt: now, updatedAt: now },
  };
  const result = logisticsShipmentDto(row as never, now);
  assert.equal(result.exception?.criticality, "critical");
  assert.deepEqual(result.exception?.reasons, ["SLA overdue", "Repeated attempt", "Finance exposure"]);
  assert.deepEqual(result.exception?.owner, { type: "pickup_staff", name: "Rider Rahim" });
  assert.equal(result.exception?.financeExposureMinor, "10700");
  assert.equal(result.exception?.slaState, "overdue");
});

test("remitted COD is excluded and an unassigned exception stays explicit", () => {
  const now = new Date("2026-10-13T12:00:00.000Z");
  const row = {
    id: shipmentId, vendorOrderId: "package", status: "FAILED", provider: null, trackingNumber: null, codState: "cod_remitted", codRemittanceReference: "REM", codDisputeReason: null, rtoReceivedAt: null, shippedAt: null, deliveredAt: null, createdAt: now, updatedAt: now,
    vendorOrder: { orderId: "order", vendorId: "vendor", totalMinor: 10000n, vendor: { displayName: "Seller" }, shop: { name: "Shop" }, order: { orderNumber: "AG-1", currency: "BDT", addresses: [], payments: [{ method: "COD" }] } }, assignment: null,
    failedDelivery: { reason: "Needs review", attemptCount: 1, nextAttemptAt: null, redeliveryFeeMinor: 0n, returnFeeMinor: 0n, createdAt: now, updatedAt: now }
  };
  const result = logisticsShipmentDto(row as never, now);
  assert.equal(result.exception?.criticality, "standard");
  assert.equal(result.exception?.financeExposureMinor, "0");
  assert.equal(result.exception?.slaState, "unscheduled");
  assert.deepEqual(result.exception?.owner, { type: "operations", name: "Operations queue" });
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
  const client = transactional({ shipment: { findMany: async () => [{ id: shipmentId, status: "IN_TRANSIT" }] } }) as unknown as PrismaClient;
  await assert.rejects(() => new LogisticsService(client).confirmManifestPickup(session, "manifest-1", { shipmentIds: [shipmentId], note: "Courier pickup confirmed" }), /must be ready to ship/);
});

test("manifest pickup requires assignment and commits state, events and audit atomically", async () => {
  const calls: string[] = [];
  const assignment = { courierPartnerId: shipmentId, pickupStaffId: null, courierPartner: { status: "active" }, pickupStaff: null };
  const unassigned = transactional({ shipment: { findMany: async () => [{ id: shipmentId, status: "READY_TO_SHIP", assignment: null }] } }) as unknown as PrismaClient;
  await assert.rejects(() => new LogisticsService(unassigned).confirmManifestPickup(session, "manifest-1", { shipmentIds: [shipmentId], note: "Courier pickup confirmed" }), /must have an active courier/);
  const client = transactional({
    shipment: { findMany: async () => [{ id: shipmentId, status: "READY_TO_SHIP", assignment }], updateMany: async () => { calls.push("shipments"); return { count: 1 }; } },
    shipmentEvent: { createMany: async () => { calls.push("events"); } },
    auditLog: { create: async () => { calls.push("audit"); } }
  }) as unknown as PrismaClient;
  const result = await new LogisticsService(client).confirmManifestPickup(session, "manifest-1", { shipmentIds: [shipmentId], note: "Courier pickup confirmed" });
  assert.equal(result.shipmentCount, 1);
  assert.deepEqual(calls, ["shipments", "events", "audit"]);
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
