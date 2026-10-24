import assert from "node:assert/strict";
import test from "node:test";
import type { PrismaClient } from "@prisma/client";
import type { Session } from "@amiyo/contracts";
import { courierProviderReadiness, LogisticsService, logisticsShipmentDto } from "./logistics.service.js";

const shipmentId = "11111111-1111-4111-8111-111111111111";
const session: Session = { principal: { userId: "22222222-2222-4222-8222-222222222222", roles: ["OPERATIONS_ADMIN"], vendorIds: [] }, status: "ACTIVE", email: null, phone: null, profile: { firstName: null, lastName: null, displayName: "Operator", avatarStorageKey: null, locale: "en", currency: "BDT" }, permissions: ["admin:read", "admin:manage"], vendorMemberships: [] };
function transactional<T extends object>(client: T) { return Object.assign(client, { $transaction: async (operation: (transaction: T) => Promise<unknown>) => operation(client) }); }

test("courier readiness exposes automatic providers and the operational fallback without secrets", () => {
  const readiness = courierProviderReadiness({ NODE_ENV: "production", AMIYO_DELIVERY_API_URL: "https://delivery.example.test", AMIYO_DELIVERY_INTEGRATION_TOKEN: "token", AMIYO_DELIVERY_WEBHOOK_SECRET: "secret", PATHAO_API_KEY: "pathao-key" });
  assert.deepEqual(readiness.find((item) => item.provider === "amiyo_delivery"), { provider: "amiyo_delivery", configured: true, mode: "live", bookingMode: "api" });
  assert.deepEqual(readiness.find((item) => item.provider === "manual"), { provider: "manual", configured: true, mode: "operations", bookingMode: "manual" });
  assert.equal(readiness.find((item) => item.provider === "steadfast")?.configured, false);
  assert.equal(JSON.stringify(readiness).includes("pathao-key"), false);
});

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

test("tracking failure commits parcel, exception and audit atomically", async () => {
  const calls: string[] = [];
  const assignment = { version: 2, courierPartnerId: shipmentId, pickupStaffId: null, courierPartner: { status: "active", name: "Courier" }, pickupStaff: null };
  const client = transactional({
    shipment: { findUnique: async () => ({ id: shipmentId, status: "IN_TRANSIT", codState: "cod_pending", provider: "manual", failedDelivery: null, assignment, vendorOrder: { order: { payments: [{ method: "COD" }] } } }), update: async ({ data }: { data: { status: string } }) => { calls.push("shipment"); return { id: shipmentId, status: data.status }; } },
    failedDeliveryRecord: { upsert: async () => { calls.push("failed-delivery"); } },
    auditLog: { create: async () => { calls.push("audit"); } }
  }) as unknown as PrismaClient;
  const row = await new LogisticsService(client).syncTrackingEvent(session, { shipmentId, status: "FAILED", description: "Customer unavailable", location: "Dhaka", occurredAt: "2026-10-13T12:00:00.000Z", providerEventId: "evt-failed", codCollected: false, expectedAssignmentVersion: 2 });
  assert.equal(row.status, "FAILED");
  assert.deepEqual(calls, ["shipment", "failed-delivery", "audit"]);
});

test("tracking delivery rejects stale assignment and missing COD evidence", async () => {
  let writes = 0;
  const assignment = { version: 2, courierPartnerId: shipmentId, pickupStaffId: null, courierPartner: { status: "active", name: "Courier" }, pickupStaff: null };
  const client = transactional({ shipment: { findUnique: async () => ({ id: shipmentId, status: "IN_TRANSIT", codState: "cod_pending", provider: "manual", failedDelivery: null, assignment, vendorOrder: { order: { payments: [{ method: "COD" }] } } }), update: async () => { writes++; } } }) as unknown as PrismaClient;
  const base = { shipmentId, status: "DELIVERED" as const, description: "Delivered", location: "Dhaka", occurredAt: "2026-10-13T12:00:00.000Z", providerEventId: "evt-delivered", codCollected: true };
  await assert.rejects(() => new LogisticsService(client).syncTrackingEvent(session, { ...base, expectedAssignmentVersion: 1 }), /changed; refresh and retry/);
  await assert.rejects(() => new LogisticsService(client).syncTrackingEvent(session, { ...base, codCollected: false, expectedAssignmentVersion: 2 }), /Confirm COD collection/);
  assert.equal(writes, 0);
});

test("COD delivery commits parcel, collection state and audit atomically", async () => {
  const calls: string[] = [];
  const assignment = { version: 4, courierPartnerId: shipmentId, pickupStaffId: null, courierPartner: { status: "active", name: "Courier" }, pickupStaff: null };
  const client = transactional({
    shipment: {
      findUnique: async () => ({ id: shipmentId, status: "IN_TRANSIT", codState: "cod_pending", provider: "manual", failedDelivery: null, assignment, vendorOrder: { order: { payments: [{ method: "COD" }] } } }),
      update: async ({ data }: { data: { status: string; codState: string; events: unknown } }) => { calls.push("shipment"); assert.equal(data.status, "DELIVERED"); assert.equal(data.codState, "cod_collected"); assert.ok(data.events); return { id: shipmentId, status: data.status, codState: data.codState }; }
    },
    auditLog: { create: async () => { calls.push("audit"); } }
  }) as unknown as PrismaClient;
  const row = await new LogisticsService(client).recordDeliveryAttempt(session, shipmentId, { outcome: "delivered", receiverName: "Customer", reason: null, notes: "Received intact", codCollected: true, expectedAssignmentVersion: 4 });
  assert.equal(row.codState, "cod_collected");
  assert.deepEqual(calls, ["shipment", "audit"]);
});

test("delivery attempt rejects stale assignment and missing COD evidence without writes", async () => {
  let writes = 0;
  const assignment = { version: 4, courierPartnerId: shipmentId, pickupStaffId: null, courierPartner: { status: "active", name: "Courier" }, pickupStaff: null };
  const client = transactional({ shipment: { findUnique: async () => ({ id: shipmentId, status: "IN_TRANSIT", codState: "cod_pending", provider: "manual", failedDelivery: null, assignment, vendorOrder: { order: { payments: [{ method: "COD" }] } } }), update: async () => { writes++; } } }) as unknown as PrismaClient;
  await assert.rejects(() => new LogisticsService(client).recordDeliveryAttempt(session, shipmentId, { outcome: "delivered", receiverName: "Customer", reason: null, notes: null, codCollected: true, expectedAssignmentVersion: 3 }), /changed; refresh and retry/);
  await assert.rejects(() => new LogisticsService(client).recordDeliveryAttempt(session, shipmentId, { outcome: "delivered", receiverName: "Customer", reason: null, notes: null, codCollected: false, expectedAssignmentVersion: 4 }), /Confirm COD collection/);
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
  const calls: string[] = [];
  const client = transactional({
    shipment: {
      findUnique: async () => ({ id: shipmentId, status: "FAILED", provider: "Manual", assignment: null, failedDelivery: { resolution: "pending" } }),
      update: async ({ data }: { data: { status: string } }) => { calls.push("shipment"); return { id: shipmentId, status: data.status }; }
    },
    failedDeliveryRecord: { upsert: async ({ update }: { update: { resolution: string } }) => { calls.push("failed-delivery"); assert.equal(update.resolution, "rto_in_transit"); return update; } },
    auditLog: { create: async () => { calls.push("audit"); } }
  }) as unknown as PrismaClient;
  const row = await new LogisticsService(client).markRto(session, shipmentId, { note: "Courier is returning the parcel" });
  assert.equal(row.status, "CANCELLED");
  assert.deepEqual(calls, ["shipment", "failed-delivery", "audit"]);
});

test("RTO receipt commits resolution, parcel evidence and audit together", async () => {
  const calls: string[] = [];
  const client = transactional({
    shipment: { findUnique: async () => ({ id: shipmentId, status: "CANCELLED", failedDelivery: { resolution: "rto_in_transit" } }), update: async () => { calls.push("shipment"); } },
    failedDeliveryRecord: { update: async ({ data }: { data: { resolution: string } }) => { calls.push("failed-delivery"); return { shipmentId, ...data }; } },
    auditLog: { create: async () => { calls.push("audit"); } }
  }) as unknown as PrismaClient;
  const result = await new LogisticsService(client).confirmRtoReceived(session, shipmentId, { note: "Seller received the returned parcel" });
  assert.equal(result.resolution, "rto_received");
  assert.deepEqual(calls, ["failed-delivery", "shipment", "audit"]);
});

test("failed-delivery reattempt is state guarded and atomic", async () => {
  const calls: string[] = [];
  const invalid = transactional({ shipment: { findUnique: async () => ({ id: shipmentId, status: "READY_TO_SHIP", failedDelivery: { resolution: "reattempt_scheduled" } }) } }) as unknown as PrismaClient;
  await assert.rejects(() => new LogisticsService(invalid).scheduleReattempt(session, shipmentId, { nextAttemptAt: "2026-10-14T12:00:00.000Z", redeliveryFeeMinor: "0", reason: "Customer requested tomorrow", note: null }), /Only an unresolved failed delivery/);
  const client = transactional({
    shipment: { findUnique: async () => ({ id: shipmentId, status: "FAILED", failedDelivery: { resolution: "pending" } }), update: async () => { calls.push("shipment"); } },
    failedDeliveryRecord: { update: async ({ data }: { data: { resolution: string } }) => { calls.push("failed-delivery"); return { shipmentId, ...data }; } },
    auditLog: { create: async () => { calls.push("audit"); } }
  }) as unknown as PrismaClient;
  const result = await new LogisticsService(client).scheduleReattempt(session, shipmentId, { nextAttemptAt: "2026-10-14T12:00:00.000Z", redeliveryFeeMinor: "0", reason: "Customer requested tomorrow", note: null });
  assert.equal(result.resolution, "reattempt_scheduled");
  assert.deepEqual(calls, ["failed-delivery", "shipment", "audit"]);
});

test("return to seller is limited to unresolved failures and commits atomically", async () => {
  const calls: string[] = [];
  const invalid = transactional({ shipment: { findUnique: async () => ({ id: shipmentId, status: "FAILED", failedDelivery: { resolution: "reattempt_scheduled" } }) } }) as unknown as PrismaClient;
  await assert.rejects(() => new LogisticsService(invalid).returnToSeller(session, shipmentId, { returnFeeMinor: "500", reason: "Attempts exhausted", note: null }), /Only an unresolved failed delivery/);
  const client = transactional({
    shipment: { findUnique: async () => ({ id: shipmentId, status: "FAILED", failedDelivery: { resolution: "pending" } }), update: async () => { calls.push("shipment"); } },
    failedDeliveryRecord: { update: async ({ data }: { data: { resolution: string } }) => { calls.push("failed-delivery"); return { shipmentId, ...data }; } },
    auditLog: { create: async () => { calls.push("audit"); } }
  }) as unknown as PrismaClient;
  const result = await new LogisticsService(client).returnToSeller(session, shipmentId, { returnFeeMinor: "500", reason: "Attempts exhausted", note: "Return through assigned courier" });
  assert.equal(result.resolution, "return_to_seller");
  assert.deepEqual(calls, ["failed-delivery", "shipment", "audit"]);
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
  const calls: string[] = []; let metadata: unknown;
  const client = transactional({
    return: {
      findUnique: async () => ({ id: returnId, status: "RECEIVED", version: 3, events: [] }),
      update: async ({ data }: { data: { status: string; events: { create: { metadata: unknown } } } }) => { calls.push("return"); metadata = data.events.create.metadata; return { id: returnId, status: data.status, version: 4, requestedMinor: 1000n, approvedMinor: 1000n, createdAt: new Date("2026-08-14T00:00:00Z"), updatedAt: new Date("2026-08-14T00:00:00Z") }; }
    },
    auditLog: { create: async () => { calls.push("audit"); } }
  }) as unknown as PrismaClient;
  const row = await new LogisticsService(client).reverseReturnAction(session, returnId, "inspected", { note: "Warehouse inspection completed", trackingNumber: null, pickupAt: null, inspection: { condition: "sellable" }, expectedVersion: 3 });
  assert.equal(row.status, "INSPECTED");
  assert.deepEqual(metadata, { logisticsState: "inspected", trackingNumber: null, pickupAt: null, inspection: { condition: "sellable" } });
  assert.deepEqual(calls, ["return", "audit"]);
});

test("reverse logistics rejects stale and out-of-order pickup actions", async () => {
  const returnId = "33333333-3333-4333-8333-333333333333"; let writes = 0;
  const scheduledEvent = { metadata: { logisticsState: "schedule_pickup" }, createdAt: new Date("2026-10-13T10:00:00.000Z") };
  const stale = transactional({ return: { findUnique: async () => ({ id: returnId, status: "PICKUP_SCHEDULED", version: 4, events: [scheduledEvent] }), update: async () => { writes++; } } }) as unknown as PrismaClient;
  await assert.rejects(() => new LogisticsService(stale).reverseReturnAction(session, returnId, "picked_up", { note: "Courier collected return", trackingNumber: "RET-1", pickupAt: null, inspection: null, expectedVersion: 3 }), /changed; refresh and retry/);
  const outOfOrder = transactional({ return: { findUnique: async () => ({ id: returnId, status: "PICKUP_SCHEDULED", version: 4, events: [] }), update: async () => { writes++; } } }) as unknown as PrismaClient;
  await assert.rejects(() => new LogisticsService(outOfOrder).reverseReturnAction(session, returnId, "in_transit", { note: "Return entered transit", trackingNumber: "RET-1", pickupAt: null, inspection: null, expectedVersion: 4 }), /before starting transit/);
  assert.equal(writes, 0);
});

test("COD remittance requires reference and follows the shipment state machine", async () => {
  const calls: string[] = [];
  const client = transactional({ shipment: { findUnique: async () => ({ id: shipmentId, status: "DELIVERED", codState: "cod_collected", codRemittanceReference: null, vendorOrder: { order: { payments: [{ method: "COD" }] } } }), update: async ({ data }: { data: { codState: string; codRemittanceReference: string } }) => { calls.push("shipment"); return { id: shipmentId, ...data }; } }, auditLog: { create: async () => { calls.push("audit"); } } }) as unknown as PrismaClient;
  const service = new LogisticsService(client);
  await assert.rejects(() => service.updateCodState(session, shipmentId, "cod_remitted", { reference: null, reason: null, note: "Courier remittance received" }), /reference is required/);
  const row = await service.updateCodState(session, shipmentId, "cod_remitted", { reference: "REM-100", reason: null, note: "Courier remittance received" });
  assert.equal(row.codState, "cod_remitted");
  assert.equal(row.codRemittanceReference, "REM-100");
  assert.deepEqual(calls, ["shipment", "audit"]);
});

test("COD transitions reject pre-delivery collection and invalid failure states", async () => {
  let writes = 0;
  const payment = { vendorOrder: { order: { payments: [{ method: "COD" }] } } };
  const inTransit = transactional({ shipment: { findUnique: async () => ({ id: shipmentId, status: "IN_TRANSIT", codState: "cod_pending", codRemittanceReference: null, ...payment }), update: async () => { writes++; } } }) as unknown as PrismaClient;
  await assert.rejects(() => new LogisticsService(inTransit).updateCodState(session, shipmentId, "cod_collected", { reference: null, reason: null, note: "Collected early" }), /only after delivery/);
  const delivered = transactional({ shipment: { findUnique: async () => ({ id: shipmentId, status: "DELIVERED", codState: "cod_pending", codRemittanceReference: null, ...payment }), update: async () => { writes++; } } }) as unknown as PrismaClient;
  await assert.rejects(() => new LogisticsService(delivered).updateCodState(session, shipmentId, "cod_failed", { reference: null, reason: "Not collected", note: "Marked failed" }), /failed or cancelled parcel/);
  assert.equal(writes, 0);
});

test("COD remittance uses the active courier identity and audits atomically", async () => {
  const calls: string[] = [];
  const row = { id: "remittance-1", courierPartnerId: shipmentId, courierName: "Trusted Courier", collectedAmountMinor: 10000n, remittedAmountMinor: 9000n, forwardedToVendorMinor: 8000n, reference: "REM-100", notes: null, orderIds: [], createdBy: session.principal.userId, createdAt: new Date("2026-10-13T12:00:00.000Z") };
  const client = transactional({
    courierPartner: { findFirst: async () => ({ id: shipmentId, status: "active", name: "Trusted Courier" }) },
    codRemittance: { create: async ({ data }: { data: { courierName: string } }) => { calls.push("remittance"); assert.equal(data.courierName, "Trusted Courier"); return row; } },
    auditLog: { create: async () => { calls.push("audit"); } }
  }) as unknown as PrismaClient;
  const result = await new LogisticsService(client).recordCodRemittance(session, { courierPartnerId: shipmentId, courierName: "Spoofed Name", collectedAmountMinor: "10000", remittedAmountMinor: "9000", forwardedToVendorMinor: "8000", reference: "REM-100", notes: null, orderIds: [] });
  assert.equal(result.courierName, "Trusted Courier");
  assert.deepEqual(calls, ["remittance", "audit"]);
});

test("COD remittance rejects an inactive selected courier before writes", async () => {
  let writes = 0;
  const client = transactional({ courierPartner: { findFirst: async () => null }, codRemittance: { create: async () => { writes++; } } }) as unknown as PrismaClient;
  await assert.rejects(() => new LogisticsService(client).recordCodRemittance(session, { courierPartnerId: shipmentId, courierName: "Courier", collectedAmountMinor: "10000", remittedAmountMinor: "9000", forwardedToVendorMinor: "0", reference: "REM-100", notes: null, orderIds: [] }), /selected courier is not active/);
  assert.equal(writes, 0);
});
