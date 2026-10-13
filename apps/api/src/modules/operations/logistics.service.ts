import { Prisma, type PrismaClient, type ReturnStatus, type ShipmentStatus } from "@prisma/client";
import type { CodRemittanceInput, CourierPartnerInput, DeliveryFeeRuleInput, FailedDeliveryReattempt, FailedDeliveryReturn, LogisticsAssignmentInput, LogisticsCodStateInput, LogisticsDeliveryAttempt, LogisticsManifestPickup, LogisticsNote, LogisticsReturnAction, LogisticsShipmentTransition, LogisticsTrackingEvent, LogisticsZoneInput, PickupStaffInput, Session } from "@amiyo/contracts";
import { withSerializableTransaction } from "../../infrastructure/database/transaction.js";
import { ApiProblem } from "../../middleware/api-problem.js";

const json = (value: unknown) => JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
const operatorRoles = new Set(["OPERATIONS_ADMIN", "SUPER_ADMIN"]);
const transitions: Record<ShipmentStatus, ShipmentStatus[]> = {
  PENDING: ["READY_TO_SHIP", "CANCELLED"], READY_TO_SHIP: ["PICKED_UP", "FAILED", "CANCELLED"], PICKED_UP: ["IN_TRANSIT", "FAILED"],
  IN_TRANSIT: ["DELIVERED", "FAILED"], DELIVERED: [], FAILED: ["READY_TO_SHIP", "CANCELLED"], CANCELLED: []
};
const reverseTransitions: Record<string, { allowed: ReturnStatus[]; status: ReturnStatus }> = {
  generate_label: { allowed: ["APPROVED", "PICKUP_SCHEDULED"], status: "APPROVED" },
  schedule_pickup: { allowed: ["APPROVED"], status: "PICKUP_SCHEDULED" },
  picked_up: { allowed: ["PICKUP_SCHEDULED"], status: "PICKUP_SCHEDULED" },
  in_transit: { allowed: ["PICKUP_SCHEDULED"], status: "PICKUP_SCHEDULED" },
  received: { allowed: ["PICKUP_SCHEDULED"], status: "RECEIVED" },
  inspected: { allowed: ["RECEIVED"], status: "INSPECTED" },
  restocked: { allowed: ["INSPECTED"], status: "CLOSED" },
  disposed: { allowed: ["INSPECTED"], status: "CLOSED" },
  refurbished: { allowed: ["INSPECTED"], status: "CLOSED" }
};
const codTransitions: Record<string, string[]> = { cod_pending: ["cod_collected", "cod_failed", "cod_disputed"], cod_collected: ["cod_remitted", "cod_disputed"], cod_disputed: ["cod_collected", "cod_failed"], cod_failed: [], cod_remitted: [] };

function requireOperator(session: Session, manage = false) {
  const permission = manage ? "admin:manage" : "admin:read";
  if (session.status !== "ACTIVE" || !session.permissions.includes(permission) || !session.principal.roles.some((role) => operatorRoles.has(role))) {
    throw new ApiProblem(403, "LOGISTICS_FORBIDDEN", `Logistics ${manage ? "management" : "access"} requires operations administrator access`);
  }
}

const shipmentInclude = {
  vendorOrder: { include: { order: { include: { addresses: true, payments: { orderBy: { createdAt: "desc" as const }, take: 1 } } }, vendor: true, shop: true } },
  assignment: { include: { courierPartner: true, pickupStaff: true } }, failedDelivery: true
};
type ShipmentRow = Prisma.ShipmentGetPayload<{ include: typeof shipmentInclude }>;

export function logisticsShipmentDto(row: ShipmentRow, now = new Date()) {
  const delivery = row.vendorOrder.order.addresses.find((address) => address.type === "delivery");
  const payment = row.vendorOrder.order.payments[0];
  const slaTarget = row.failedDelivery?.nextAttemptAt ?? row.assignment?.estimatedDeliveryDate ?? null;
  const codExposure = payment?.method === "COD" && !["cod_remitted", "cod_failed"].includes(row.codState) ? row.vendorOrder.totalMinor : 0n;
  const feeExposure = (row.failedDelivery?.redeliveryFeeMinor ?? 0n) + (row.failedDelivery?.returnFeeMinor ?? 0n);
  const exposureMinor = codExposure + feeExposure;
  const overdue = Boolean(slaTarget && slaTarget.getTime() < now.getTime());
  const reasons = [overdue ? "SLA overdue" : null, (row.failedDelivery?.attemptCount ?? 0) >= 2 ? "Repeated attempt" : null, exposureMinor > 0n ? "Finance exposure" : null].filter((value): value is string => Boolean(value));
  const criticality = overdue && exposureMinor > 0n ? "critical" : overdue || (row.failedDelivery?.attemptCount ?? 0) >= 2 ? "high" : exposureMinor > 0n ? "medium" : "standard";
  return {
    id: row.id, vendorOrderId: row.vendorOrderId, orderId: row.vendorOrder.orderId, orderNumber: row.vendorOrder.order.orderNumber,
    vendorId: row.vendorOrder.vendorId, vendorName: row.vendorOrder.vendor.displayName, shopName: row.vendorOrder.shop.name, status: row.status,
    provider: row.provider, trackingNumber: row.trackingNumber, codState: row.codState, codRemittanceReference: row.codRemittanceReference, codDisputeReason: row.codDisputeReason, rtoReceivedAt: row.rtoReceivedAt?.toISOString() ?? null, totalMinor: row.vendorOrder.totalMinor.toString(), currency: row.vendorOrder.order.currency,
    paymentMethod: payment?.method ?? null, codAmountMinor: payment?.method === "COD" ? row.vendorOrder.totalMinor.toString() : "0",
    deliveryAddress: delivery ? { recipientName: delivery.recipientName, phone: delivery.phone, line1: delivery.line1, line2: delivery.line2, division: delivery.division, district: delivery.district, upazila: delivery.upazila, unionName: delivery.unionName, postalCode: delivery.postalCode } : null,
    assignment: row.assignment ? { ...row.assignment, pickupDate: row.assignment.pickupDate?.toISOString() ?? null, estimatedDeliveryDate: row.assignment.estimatedDeliveryDate?.toISOString() ?? null, createdAt: row.assignment.createdAt.toISOString(), updatedAt: row.assignment.updatedAt.toISOString() } : null,
    failedDelivery: row.failedDelivery ? { ...row.failedDelivery, redeliveryFeeMinor: row.failedDelivery.redeliveryFeeMinor.toString(), returnFeeMinor: row.failedDelivery.returnFeeMinor.toString(), nextAttemptAt: row.failedDelivery.nextAttemptAt?.toISOString() ?? null, createdAt: row.failedDelivery.createdAt.toISOString(), updatedAt: row.failedDelivery.updatedAt.toISOString() } : null,
    exception: row.failedDelivery ? { criticality, reasons, owner: row.assignment?.pickupStaff ? { type: "pickup_staff", name: row.assignment.pickupStaff.name } : row.assignment?.courierPartner ? { type: "courier", name: row.assignment.courierPartner.name } : { type: "operations", name: "Operations queue" }, slaTargetAt: slaTarget?.toISOString() ?? null, slaState: slaTarget ? overdue ? "overdue" : "scheduled" : "unscheduled", financeExposureMinor: exposureMinor.toString(), codExposureMinor: codExposure.toString(), feeExposureMinor: feeExposure.toString() } : null,
    shippedAt: row.shippedAt?.toISOString() ?? null, deliveredAt: row.deliveredAt?.toISOString() ?? null, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString()
  };
}

export class LogisticsService {
  constructor(private readonly client: PrismaClient) {}

  private async audit(session: Session, action: string, resourceType: string, resourceId: string, before: unknown, after: unknown) {
    await this.client.auditLog.create({ data: { actorUserId: session.principal.userId, actorType: "admin", action, resourceType, resourceId, before: json(before), after: json(after) } });
  }

  async overview(session: Session) {
    requireOperator(session);
    const [zones, couriers, pickupStaff, feeRules, shipments, remittances] = await Promise.all([
      this.client.logisticsZone.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }), this.client.courierPartner.findMany({ orderBy: { name: "asc" } }),
      this.client.pickupStaff.findMany({ orderBy: { name: "asc" } }), this.client.deliveryFeeRule.findMany({ orderBy: [{ priority: "asc" }, { name: "asc" }] }),
      this.client.shipment.findMany({ include: shipmentInclude, orderBy: { updatedAt: "desc" }, take: 250 }), this.client.codRemittance.findMany({ include: { courierPartner: true }, orderBy: { createdAt: "desc" }, take: 100 })
    ]);
    const shipmentRows = shipments.map((row) => logisticsShipmentDto(row));
    return { zones, couriers: couriers.map((row) => ({ ...row, baseDeliveryCostMinor: row.baseDeliveryCostMinor.toString(), codCollectionFeeMinor: row.codCollectionFeeMinor.toString() })), pickupStaff, feeRules: feeRules.map((row) => this.feeRuleDto(row)), shipments: shipmentRows, remittances: remittances.map((row) => this.remittanceDto(row)), summary: { totalShipments: shipmentRows.length, readyToShip: shipmentRows.filter((row) => row.status === "READY_TO_SHIP").length, activeParcels: shipmentRows.filter((row) => ["PICKED_UP", "IN_TRANSIT"].includes(row.status)).length, failedDeliveries: shipmentRows.filter((row) => row.status === "FAILED" || row.failedDelivery?.resolution === "vendor_reported").length, codOutstandingMinor: remittances.reduce((sum, row) => sum + (row.collectedAmountMinor - row.remittedAmountMinor), 0n).toString() } };
  }

  async shipments(session: Session) { requireOperator(session); return (await this.client.shipment.findMany({ include: shipmentInclude, orderBy: { updatedAt: "desc" }, take: 250 })).map((row) => logisticsShipmentDto(row)); }
  async dashboard(session: Session) { return this.overview(session); }
  async stateMachine(session: Session) { requireOperator(session); return { forward: transitions, reverse: reverseTransitions, cod: codTransitions }; }
  async courierReadiness(session: Session) { requireOperator(session); return ["pathao", "steadfast", "redx"].map((provider) => ({ provider, configured: Boolean(process.env[`${provider.toUpperCase()}_API_KEY`]), mode: process.env.NODE_ENV === "production" ? "live" : "sandbox" })); }
  async auditLog(session: Session) { requireOperator(session); return this.client.auditLog.findMany({ where: { action: { startsWith: "logistics." } }, orderBy: { createdAt: "desc" }, take: 250 }); }
  async zones(session: Session) { requireOperator(session); return this.client.logisticsZone.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }); }
  async couriers(session: Session) { requireOperator(session); return (await this.client.courierPartner.findMany({ orderBy: { name: "asc" } })).map((row) => ({ ...row, baseDeliveryCostMinor: row.baseDeliveryCostMinor.toString(), codCollectionFeeMinor: row.codCollectionFeeMinor.toString() })); }
  async staff(session: Session) { requireOperator(session); return this.client.pickupStaff.findMany({ orderBy: { name: "asc" } }); }
  async feeRules(session: Session) { requireOperator(session); return (await this.client.deliveryFeeRule.findMany({ orderBy: [{ priority: "asc" }, { name: "asc" }] })).map((row) => this.feeRuleDto(row)); }
  async failedDeliveries(session: Session) { requireOperator(session); return (await this.client.shipment.findMany({ where: { OR: [{ status: "FAILED" }, { failedDelivery: { resolution: "vendor_reported" } }] }, include: shipmentInclude, orderBy: { updatedAt: "desc" } })).map((row) => logisticsShipmentDto(row)); }

  async saveZone(session: Session, input: LogisticsZoneInput, id?: string) { requireOperator(session, true); const before = id ? await this.client.logisticsZone.findUnique({ where: { id } }) : null; const data = { ...input, districts: json(input.districts), courierPartnerIds: json(input.courierPartnerIds) }; const row = id ? await this.client.logisticsZone.update({ where: { id }, data }) : await this.client.logisticsZone.create({ data }); await this.audit(session, id ? "logistics.zone.updated" : "logistics.zone.created", "logistics_zone", row.id, before, row); return row; }
  async saveCourier(session: Session, input: CourierPartnerInput, id?: string) { requireOperator(session, true); const before = id ? await this.client.courierPartner.findUnique({ where: { id } }) : null; const data = { ...input, serviceZones: json(input.serviceZones), baseDeliveryCostMinor: BigInt(input.baseDeliveryCostMinor), codCollectionFeeMinor: BigInt(input.codCollectionFeeMinor) }; const row = id ? await this.client.courierPartner.update({ where: { id }, data }) : await this.client.courierPartner.create({ data }); await this.audit(session, id ? "logistics.courier.updated" : "logistics.courier.created", "courier_partner", row.id, before, row); return { ...row, baseDeliveryCostMinor: row.baseDeliveryCostMinor.toString(), codCollectionFeeMinor: row.codCollectionFeeMinor.toString() }; }
  async saveStaff(session: Session, input: PickupStaffInput, id?: string) { requireOperator(session, true); const before = id ? await this.client.pickupStaff.findUnique({ where: { id } }) : null; const data = { ...input, assignedZones: json(input.assignedZones), assignedLocations: json(input.assignedLocations), assignedVendorIds: json(input.assignedVendorIds) }; const row = id ? await this.client.pickupStaff.update({ where: { id }, data }) : await this.client.pickupStaff.create({ data }); await this.audit(session, id ? "logistics.pickup_staff.updated" : "logistics.pickup_staff.created", "pickup_staff", row.id, before, row); return row; }
  async saveFeeRule(session: Session, input: DeliveryFeeRuleInput, id?: string) { requireOperator(session, true); const before = id ? await this.client.deliveryFeeRule.findUnique({ where: { id } }) : null; const { freeShippingThresholdMinor, ...rest } = input; const data = { ...rest, minOrderAmountMinor: BigInt(input.minOrderAmountMinor), maxOrderAmountMinor: BigInt(input.maxOrderAmountMinor), baseFeeMinor: BigInt(input.baseFeeMinor), perItemFeeMinor: BigInt(input.perItemFeeMinor), feePerKgMinor: BigInt(input.feePerKgMinor), codFeeMinor: BigInt(input.codFeeMinor), redeliveryFeeMinor: BigInt(input.redeliveryFeeMinor), freeShippingThreshold: BigInt(freeShippingThresholdMinor), paymentMethods: json(input.paymentMethods) }; const row = id ? await this.client.deliveryFeeRule.update({ where: { id }, data }) : await this.client.deliveryFeeRule.create({ data }); await this.audit(session, id ? "logistics.fee_rule.updated" : "logistics.fee_rule.created", "delivery_fee_rule", row.id, before, row); return this.feeRuleDto(row); }

  async assignShipment(session: Session, shipmentId: string, input: LogisticsAssignmentInput) {
    requireOperator(session, true);
    if (!input.courierPartnerId && !input.pickupStaffId) throw new ApiProblem(400, "ASSIGNMENT_TARGET_REQUIRED", "Select an active courier or pickup staff member");
    return withSerializableTransaction(this.client, async (transaction) => {
      const shipment = await transaction.shipment.findUnique({ where: { id: shipmentId }, include: { assignment: true } });
      if (!shipment) throw new ApiProblem(404, "SHIPMENT_NOT_FOUND", "Shipment not found");
      if (!["PENDING", "READY_TO_SHIP", "FAILED"].includes(shipment.status)) throw new ApiProblem(409, "ASSIGNMENT_NOT_ALLOWED", `Cannot assign a ${shipment.status.toLowerCase()} parcel`);
      if (shipment.assignment && input.expectedVersion === null) throw new ApiProblem(409, "ASSIGNMENT_VERSION_REQUIRED", "Refresh this parcel before changing its assignment");
      if (input.expectedVersion !== null && shipment.assignment?.version !== input.expectedVersion) throw new ApiProblem(409, "ASSIGNMENT_VERSION_CONFLICT", "Parcel assignment changed; refresh and retry");
      const [courier, pickupStaff] = await Promise.all([
        input.courierPartnerId ? transaction.courierPartner.findFirst({ where: { id: input.courierPartnerId, status: "active" } }) : null,
        input.pickupStaffId ? transaction.pickupStaff.findFirst({ where: { id: input.pickupStaffId, status: "active" } }) : null
      ]);
      if (input.courierPartnerId && !courier) throw new ApiProblem(409, "COURIER_UNAVAILABLE", "The selected courier is not active");
      if (input.pickupStaffId && !pickupStaff) throw new ApiProblem(409, "PICKUP_STAFF_UNAVAILABLE", "The selected pickup staff member is not active");
      const data = { courierPartnerId: input.courierPartnerId, pickupStaffId: input.pickupStaffId, bookingMode: input.bookingMode, trackingNumber: input.trackingNumber, pickupDate: input.pickupDate ? new Date(input.pickupDate) : null, pickupWindow: input.pickupWindow, estimatedDeliveryDate: input.estimatedDeliveryDate ? new Date(input.estimatedDeliveryDate) : null, note: input.note };
      const assignment = await transaction.logisticsAssignment.upsert({ where: { shipmentId }, create: { shipmentId, ...data }, update: { ...data, version: { increment: 1 } }, include: { courierPartner: true, pickupStaff: true } });
      await transaction.shipment.update({ where: { id: shipmentId }, data: { provider: assignment.courierPartner?.provider ?? shipment.provider, trackingNumber: input.trackingNumber ?? shipment.trackingNumber } });
      await transaction.auditLog.create({ data: { actorUserId: session.principal.userId, actorType: "admin", action: "logistics.shipment.assigned", resourceType: "shipment", resourceId: shipmentId, before: json(shipment.assignment), after: json(assignment) } });
      return assignment;
    });
  }
  async syncTrackingEvent(session: Session, input: LogisticsTrackingEvent) {
    requireOperator(session, true);
    return withSerializableTransaction(this.client, async (transaction) => {
      const shipment = await transaction.shipment.findUnique({ where: { id: input.shipmentId }, include: { failedDelivery: true, assignment: { include: { courierPartner: true, pickupStaff: true } }, vendorOrder: { include: { order: { include: { payments: { orderBy: { createdAt: "desc" }, take: 1 } } } } } } });
      if (!shipment) throw new ApiProblem(404, "SHIPMENT_NOT_FOUND", "Shipment not found");
      const stateChanged = input.status !== shipment.status;
      if (stateChanged && !transitions[shipment.status].includes(input.status)) throw new ApiProblem(409, "SHIPMENT_TRANSITION_INVALID", `Cannot move ${shipment.status} to ${input.status}`);
      if (stateChanged && !["PENDING", "READY_TO_SHIP"].includes(input.status)) {
        if (!shipment.assignment || (!shipment.assignment.courierPartnerId && !shipment.assignment.pickupStaffId)) throw new ApiProblem(409, "SHIPMENT_ASSIGNMENT_REQUIRED", "An active courier or pickup staff assignment is required");
        if (input.expectedAssignmentVersion === null) throw new ApiProblem(409, "ASSIGNMENT_VERSION_REQUIRED", "Refresh this parcel before synchronizing its state");
        if (shipment.assignment.version !== input.expectedAssignmentVersion) throw new ApiProblem(409, "ASSIGNMENT_VERSION_CONFLICT", "Parcel assignment changed; refresh and retry");
        if (shipment.assignment.courierPartnerId && shipment.assignment.courierPartner?.status !== "active") throw new ApiProblem(409, "COURIER_UNAVAILABLE", "The assigned courier is no longer active");
        if (shipment.assignment.pickupStaffId && shipment.assignment.pickupStaff?.status !== "active") throw new ApiProblem(409, "PICKUP_STAFF_UNAVAILABLE", "The assigned pickup staff member is no longer active");
      }
      const isCod = shipment.vendorOrder.order.payments[0]?.method === "COD";
      if (input.status === "DELIVERED" && isCod && !input.codCollected) throw new ApiProblem(409, "COD_COLLECTION_REQUIRED", "Confirm COD collection before synchronizing delivery");
      if (!isCod && input.codCollected) throw new ApiProblem(400, "COD_COLLECTION_INVALID", "This parcel does not use cash on delivery");
      const occurredAt = new Date(input.occurredAt);
      const row = await transaction.shipment.update({ where: { id: input.shipmentId }, data: { status: input.status, ...(input.status === "PICKED_UP" ? { shippedAt: occurredAt } : {}), ...(input.status === "DELIVERED" ? { deliveredAt: occurredAt, ...(isCod ? { codState: "cod_collected", codDisputeReason: null } : {}) } : {}), events: { create: { status: input.status, description: input.description, location: input.location, providerPayload: json({ providerEventId: input.providerEventId, codCollected: input.codCollected, assignmentVersion: shipment.assignment?.version ?? null }), occurredAt } } } });
      if (input.status === "FAILED") await transaction.failedDeliveryRecord.upsert({ where: { shipmentId: input.shipmentId }, create: { shipmentId: input.shipmentId, courierName: shipment.assignment?.courierPartner?.name ?? shipment.provider, reason: input.description, resolution: "pending" }, update: { reason: input.description, attemptCount: { increment: 1 }, resolution: "pending" } });
      else if (input.status === "DELIVERED" && shipment.failedDelivery) await transaction.failedDeliveryRecord.update({ where: { shipmentId: input.shipmentId }, data: { resolution: "delivered" } });
      await transaction.auditLog.create({ data: { actorUserId: session.principal.userId, actorType: "admin", action: "logistics.tracking.synced", resourceType: "shipment", resourceId: input.shipmentId, before: json({ status: shipment.status, codState: shipment.codState, assignmentVersion: shipment.assignment?.version ?? null }), after: json({ ...input, codState: isCod && input.status === "DELIVERED" ? "cod_collected" : shipment.codState }) } });
      return row;
    });
  }
  async transitionShipment(session: Session, shipmentId: string, input: LogisticsShipmentTransition) {
    requireOperator(session, true);
    return withSerializableTransaction(this.client, async (transaction) => {
      const shipment = await transaction.shipment.findUnique({
        where: { id: shipmentId },
        include: { assignment: { include: { courierPartner: true, pickupStaff: true } } }
      });
      if (!shipment) throw new ApiProblem(404, "SHIPMENT_NOT_FOUND", "Shipment not found");
      if (!transitions[shipment.status].includes(input.status)) throw new ApiProblem(409, "SHIPMENT_TRANSITION_INVALID", `Cannot move ${shipment.status} to ${input.status}`);
      if (["PICKED_UP", "IN_TRANSIT"].includes(input.status)) {
        if (!shipment.assignment || (!shipment.assignment.courierPartnerId && !shipment.assignment.pickupStaffId)) throw new ApiProblem(409, "SHIPMENT_ASSIGNMENT_REQUIRED", "Assign an active courier or pickup staff member before advancing this parcel");
        if (input.expectedAssignmentVersion === null) throw new ApiProblem(409, "ASSIGNMENT_VERSION_REQUIRED", "Refresh this parcel before advancing its state");
        if (shipment.assignment.version !== input.expectedAssignmentVersion) throw new ApiProblem(409, "ASSIGNMENT_VERSION_CONFLICT", "Parcel assignment changed; refresh and retry");
        if (shipment.assignment.courierPartnerId && shipment.assignment.courierPartner?.status !== "active") throw new ApiProblem(409, "COURIER_UNAVAILABLE", "The assigned courier is no longer active");
        if (shipment.assignment.pickupStaffId && shipment.assignment.pickupStaff?.status !== "active") throw new ApiProblem(409, "PICKUP_STAFF_UNAVAILABLE", "The assigned pickup staff member is no longer active");
      }
      const occurredAt = new Date();
      const row = await transaction.shipment.update({ where: { id: shipmentId }, data: { status: input.status, ...(input.status === "PICKED_UP" ? { shippedAt: occurredAt } : {}), ...(input.status === "DELIVERED" ? { deliveredAt: occurredAt } : {}), events: { create: { status: input.status, description: input.note, occurredAt } } } });
      await transaction.auditLog.create({ data: { actorUserId: session.principal.userId, actorType: "admin", action: "logistics.shipment.transitioned", resourceType: "shipment", resourceId: shipmentId, before: json({ status: shipment.status, assignmentVersion: shipment.assignment?.version ?? null }), after: json({ status: row.status, note: input.note, assignmentVersion: shipment.assignment?.version ?? null }) } });
      return row;
    });
  }
  async recordDeliveryAttempt(session: Session, shipmentId: string, input: LogisticsDeliveryAttempt) {
    requireOperator(session, true);
    return withSerializableTransaction(this.client, async (transaction) => {
      const status: ShipmentStatus = input.outcome === "delivered" ? "DELIVERED" : "FAILED";
      const shipment = await transaction.shipment.findUnique({ where: { id: shipmentId }, include: { failedDelivery: true, assignment: { include: { courierPartner: true, pickupStaff: true } }, vendorOrder: { include: { order: { include: { payments: { orderBy: { createdAt: "desc" }, take: 1 } } } } } } });
      if (!shipment) throw new ApiProblem(404, "SHIPMENT_NOT_FOUND", "Shipment not found");
      if (shipment.status !== "IN_TRANSIT") throw new ApiProblem(409, "DELIVERY_ATTEMPT_NOT_ALLOWED", "Only an in-transit parcel can record a delivery attempt");
      if (!shipment.assignment || (!shipment.assignment.courierPartnerId && !shipment.assignment.pickupStaffId)) throw new ApiProblem(409, "SHIPMENT_ASSIGNMENT_REQUIRED", "An active courier or pickup staff assignment is required");
      if (shipment.assignment.version !== input.expectedAssignmentVersion) throw new ApiProblem(409, "ASSIGNMENT_VERSION_CONFLICT", "Parcel assignment changed; refresh and retry");
      if (shipment.assignment.courierPartnerId && shipment.assignment.courierPartner?.status !== "active") throw new ApiProblem(409, "COURIER_UNAVAILABLE", "The assigned courier is no longer active");
      if (shipment.assignment.pickupStaffId && shipment.assignment.pickupStaff?.status !== "active") throw new ApiProblem(409, "PICKUP_STAFF_UNAVAILABLE", "The assigned pickup staff member is no longer active");
      const isCod = shipment.vendorOrder.order.payments[0]?.method === "COD";
      if (status === "DELIVERED" && isCod && !input.codCollected) throw new ApiProblem(409, "COD_COLLECTION_REQUIRED", "Confirm COD collection before completing this delivery");
      if (!isCod && input.codCollected) throw new ApiProblem(400, "COD_COLLECTION_INVALID", "This parcel does not use cash on delivery");
      const occurredAt = new Date();
      const row = await transaction.shipment.update({ where: { id: shipmentId }, data: { status, ...(status === "DELIVERED" ? { deliveredAt: occurredAt, ...(isCod ? { codState: "cod_collected", codDisputeReason: null } : {}) } : {}), events: { create: { status, description: input.reason || input.notes || `Delivery ${input.outcome}`, providerPayload: json({ receiverName: input.receiverName, codCollected: input.codCollected, assignmentVersion: shipment.assignment.version }), occurredAt } } } });
      if (status === "FAILED") await transaction.failedDeliveryRecord.upsert({ where: { shipmentId }, create: { shipmentId, courierName: shipment.assignment.courierPartner?.name ?? shipment.provider, reason: input.reason!, note: input.notes }, update: { reason: input.reason!, note: input.notes, attemptCount: { increment: 1 }, resolution: "pending" } });
      else if (shipment.failedDelivery) await transaction.failedDeliveryRecord.update({ where: { shipmentId }, data: { resolution: "delivered" } });
      await transaction.auditLog.create({ data: { actorUserId: session.principal.userId, actorType: "admin", action: `logistics.delivery.${input.outcome}`, resourceType: "shipment", resourceId: shipmentId, before: json({ status: shipment.status, codState: shipment.codState, assignmentVersion: shipment.assignment.version }), after: json({ status, codState: isCod && status === "DELIVERED" ? "cod_collected" : shipment.codState, ...input }) } });
      return row;
    });
  }
  async markRto(session: Session, shipmentId: string, input: LogisticsNote) {
    requireOperator(session, true);
    return withSerializableTransaction(this.client, async (transaction) => {
      const shipment = await transaction.shipment.findUnique({ where: { id: shipmentId }, include: { assignment: { include: { courierPartner: true } }, failedDelivery: true } });
      if (!shipment) throw new ApiProblem(404, "SHIPMENT_NOT_FOUND", "Shipment not found");
      if (!["READY_TO_SHIP", "PICKED_UP", "IN_TRANSIT", "FAILED"].includes(shipment.status)) throw new ApiProblem(409, "RTO_NOT_ALLOWED", `Cannot mark ${shipment.status} as RTO`);
      if (shipment.failedDelivery?.resolution === "rto_in_transit" || shipment.failedDelivery?.resolution === "rto_received") throw new ApiProblem(409, "RTO_ALREADY_STARTED", "Return-to-origin is already in progress or complete");
      const occurredAt = new Date();
      const row = await transaction.shipment.update({ where: { id: shipmentId }, data: { status: "CANCELLED", events: { create: { status: "CANCELLED", description: input.note, providerPayload: json({ logisticsState: "rto_in_transit" }), occurredAt } } } });
      await transaction.failedDeliveryRecord.upsert({ where: { shipmentId }, create: { shipmentId, courierName: shipment.assignment?.courierPartner?.name ?? shipment.provider, reason: input.note, resolution: "rto_in_transit" }, update: { reason: input.note, resolution: "rto_in_transit" } });
      await transaction.auditLog.create({ data: { actorUserId: session.principal.userId, actorType: "admin", action: "logistics.rto.marked", resourceType: "shipment", resourceId: shipmentId, before: json({ status: shipment.status, resolution: shipment.failedDelivery?.resolution ?? null }), after: json({ status: "CANCELLED", resolution: "rto_in_transit", note: input.note }) } });
      return row;
    });
  }
  async confirmRtoReceived(session: Session, shipmentId: string, input: LogisticsNote) {
    requireOperator(session, true);
    return withSerializableTransaction(this.client, async (transaction) => {
      const shipment = await transaction.shipment.findUnique({ where: { id: shipmentId }, include: { failedDelivery: true } });
      if (!shipment) throw new ApiProblem(404, "SHIPMENT_NOT_FOUND", "Shipment not found");
      if (shipment.status !== "CANCELLED" || shipment.failedDelivery?.resolution !== "rto_in_transit") throw new ApiProblem(409, "RTO_NOT_IN_TRANSIT", "Shipment is not awaiting RTO receipt");
      const occurredAt = new Date();
      const record = await transaction.failedDeliveryRecord.update({ where: { shipmentId }, data: { resolution: "rto_received", note: input.note } });
      await transaction.shipment.update({ where: { id: shipmentId }, data: { rtoReceivedAt: occurredAt, events: { create: { status: "CANCELLED", description: input.note, providerPayload: json({ logisticsState: "rto_received" }), occurredAt } } } });
      await transaction.auditLog.create({ data: { actorUserId: session.principal.userId, actorType: "admin", action: "logistics.rto.received", resourceType: "shipment", resourceId: shipmentId, before: json({ resolution: "rto_in_transit" }), after: json({ resolution: "rto_received", note: input.note }) } });
      return record;
    });
  }

  async updateCodState(session: Session, shipmentId: string, targetState: string, input: LogisticsCodStateInput) {
    requireOperator(session, true);
    return withSerializableTransaction(this.client, async (transaction) => {
      const shipment = await transaction.shipment.findUnique({ where: { id: shipmentId }, include: { vendorOrder: { include: { order: { include: { payments: { orderBy: { createdAt: "desc" }, take: 1 } } } } } } });
      if (!shipment) throw new ApiProblem(404, "SHIPMENT_NOT_FOUND", "Shipment not found");
      if (shipment.vendorOrder.order.payments[0]?.method !== "COD") throw new ApiProblem(409, "COD_NOT_APPLICABLE", "This parcel does not use cash on delivery");
      if (!codTransitions[shipment.codState]?.includes(targetState)) throw new ApiProblem(409, "COD_TRANSITION_INVALID", `Cannot move ${shipment.codState} to ${targetState}`);
      if (["cod_collected", "cod_remitted"].includes(targetState) && shipment.status !== "DELIVERED") throw new ApiProblem(409, "COD_DELIVERY_REQUIRED", "COD can be collected or remitted only after delivery");
      if (targetState === "cod_failed" && !["FAILED", "CANCELLED"].includes(shipment.status)) throw new ApiProblem(409, "COD_FAILURE_NOT_ALLOWED", "COD can fail only for a failed or cancelled parcel");
      if (targetState === "cod_disputed" && !["PICKED_UP", "IN_TRANSIT", "DELIVERED", "FAILED", "CANCELLED"].includes(shipment.status)) throw new ApiProblem(409, "COD_DISPUTE_NOT_ALLOWED", "COD can be disputed only after parcel handoff");
      if (targetState === "cod_remitted" && !input.reference) throw new ApiProblem(400, "COD_REMITTANCE_REFERENCE_REQUIRED", "A remittance reference is required");
      if (["cod_failed", "cod_disputed"].includes(targetState) && !input.reason) throw new ApiProblem(400, "COD_REASON_REQUIRED", "A failure or dispute reason is required");
      const occurredAt = new Date();
      const row = await transaction.shipment.update({ where: { id: shipmentId }, data: { codState: targetState, codRemittanceReference: targetState === "cod_remitted" ? input.reference : shipment.codRemittanceReference, codDisputeReason: targetState === "cod_disputed" ? input.reason : null, events: { create: { status: shipment.status, description: input.note, providerPayload: json({ codState: targetState, reference: input.reference, reason: input.reason }), occurredAt } } } });
      await transaction.auditLog.create({ data: { actorUserId: session.principal.userId, actorType: "admin", action: `logistics.${targetState.replace("cod_", "cod.")}`, resourceType: "shipment", resourceId: shipmentId, before: json({ shipmentStatus: shipment.status, codState: shipment.codState }), after: json({ shipmentStatus: shipment.status, codState: targetState, ...input }) } });
      return row;
    });
  }

  async shipmentLabel(session: Session, shipmentId: string, recordGeneration = false) { requireOperator(session, recordGeneration); const row = await this.client.shipment.findUnique({ where: { id: shipmentId }, include: shipmentInclude }); if (!row) throw new ApiProblem(404, "SHIPMENT_NOT_FOUND", "Shipment not found"); const shipment = logisticsShipmentDto(row); const label = { labelId: `LBL-${row.id.slice(0, 8).toUpperCase()}`, generatedAt: new Date().toISOString(), parcelId: `AG-${shipment.orderNumber}-${row.id.slice(-6).toUpperCase()}`, shipment }; if (recordGeneration) { await this.client.shipmentEvent.create({ data: { shipmentId, status: row.status, description: "Parcel label generated", providerPayload: json({ labelId: label.labelId }), occurredAt: new Date() } }); await this.audit(session, "logistics.label.generated", "shipment", shipmentId, null, { labelId: label.labelId }); } return label; }

  async dispatchManifest(session: Session) { requireOperator(session); const shipments = (await this.client.shipment.findMany({ where: { status: { in: ["READY_TO_SHIP", "PICKED_UP"] } }, include: shipmentInclude, orderBy: { updatedAt: "desc" }, take: 500 })).map((row) => logisticsShipmentDto(row)); const groups = new Map<string, typeof shipments>(); for (const shipment of shipments) { const courier = shipment.assignment?.courierPartner?.name ?? shipment.provider ?? "Unassigned"; groups.set(courier, [...(groups.get(courier) ?? []), shipment]); } return { generatedAt: new Date().toISOString(), totalShipments: shipments.length, totalCodMinor: shipments.reduce((sum, row) => sum + BigInt(row.codAmountMinor), 0n).toString(), groups: [...groups].map(([courierName, rows], index) => ({ id: `manifest-${index + 1}`, courierName, shipmentIds: rows.map((row) => row.id), shipmentCount: rows.length, codAmountMinor: rows.reduce((sum, row) => sum + BigInt(row.codAmountMinor), 0n).toString(), shipments: rows })) }; }
  async confirmManifestPickup(session: Session, manifestId: string, input: LogisticsManifestPickup) {
    requireOperator(session, true);
    return withSerializableTransaction(this.client, async (transaction) => {
      const shipments = await transaction.shipment.findMany({ where: { id: { in: input.shipmentIds } }, include: { assignment: { include: { courierPartner: true, pickupStaff: true } } } });
      if (shipments.length !== input.shipmentIds.length) throw new ApiProblem(404, "MANIFEST_SHIPMENT_NOT_FOUND", "One or more manifest shipments were not found");
      if (shipments.some((row) => row.status !== "READY_TO_SHIP")) throw new ApiProblem(409, "MANIFEST_PICKUP_INVALID", "Every manifest parcel must be ready to ship");
      if (shipments.some((row) => !row.assignment || (!row.assignment.courierPartnerId && !row.assignment.pickupStaffId))) throw new ApiProblem(409, "MANIFEST_ASSIGNMENT_REQUIRED", "Every manifest parcel must have an active courier or pickup staff assignment");
      if (shipments.some((row) => row.assignment?.courierPartnerId && row.assignment.courierPartner?.status !== "active")) throw new ApiProblem(409, "COURIER_UNAVAILABLE", "A manifest courier is no longer active");
      if (shipments.some((row) => row.assignment?.pickupStaffId && row.assignment.pickupStaff?.status !== "active")) throw new ApiProblem(409, "PICKUP_STAFF_UNAVAILABLE", "A manifest pickup staff member is no longer active");
      const occurredAt = new Date();
      const updated = await transaction.shipment.updateMany({ where: { id: { in: input.shipmentIds }, status: "READY_TO_SHIP" }, data: { status: "PICKED_UP", shippedAt: occurredAt } });
      if (updated.count !== input.shipmentIds.length) throw new ApiProblem(409, "MANIFEST_PICKUP_CONFLICT", "One or more manifest parcels changed; refresh and retry");
      await transaction.shipmentEvent.createMany({ data: input.shipmentIds.map((shipmentId) => ({ shipmentId, status: "PICKED_UP" as const, description: input.note, providerPayload: json({ manifestId }), occurredAt })) });
      await transaction.auditLog.create({ data: { actorUserId: session.principal.userId, actorType: "admin", action: "logistics.manifest.pickup_confirmed", resourceType: "dispatch_manifest", resourceId: manifestId, before: Prisma.JsonNull, after: json(input) } });
      return { manifestId, status: "PICKED_UP", shipmentCount: input.shipmentIds.length };
    });
  }

  async reverseReturnAction(session: Session, returnId: string, action: string, input: LogisticsReturnAction) { requireOperator(session, true); const rule = reverseTransitions[action]; if (!rule) throw new ApiProblem(400, "RETURN_LOGISTICS_ACTION_INVALID", "Unsupported reverse logistics action"); const current = await this.client.return.findUnique({ where: { id: returnId } }); if (!current) throw new ApiProblem(404, "RETURN_NOT_FOUND", "Return not found"); if (!rule.allowed.includes(current.status)) throw new ApiProblem(409, "RETURN_LOGISTICS_TRANSITION_INVALID", `Cannot apply ${action} while return is ${current.status}`); const metadata = json({ logisticsState: action, trackingNumber: input.trackingNumber, pickupAt: input.pickupAt, inspection: input.inspection }); const row = await this.client.return.update({ where: { id: returnId }, data: { status: rule.status, version: { increment: 1 }, events: { create: { fromStatus: current.status, toStatus: rule.status, actorType: "admin", actorId: session.principal.userId, note: input.note, metadata } } } }); await this.audit(session, `logistics.return.${action}`, "return", returnId, { status: current.status }, { status: rule.status, ...input }); return { ...row, requestedMinor: row.requestedMinor.toString(), approvedMinor: row.approvedMinor?.toString() ?? null, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() }; }

  async recordCodRemittance(session: Session, input: CodRemittanceInput) {
    requireOperator(session, true);
    return withSerializableTransaction(this.client, async (transaction) => {
      const courier = input.courierPartnerId ? await transaction.courierPartner.findFirst({ where: { id: input.courierPartnerId, status: "active" } }) : null;
      if (input.courierPartnerId && !courier) throw new ApiProblem(409, "COURIER_UNAVAILABLE", "The selected courier is not active");
      const row = await transaction.codRemittance.create({ data: { courierPartnerId: input.courierPartnerId, courierName: courier?.name ?? input.courierName, collectedAmountMinor: BigInt(input.collectedAmountMinor), remittedAmountMinor: BigInt(input.remittedAmountMinor), forwardedToVendorMinor: BigInt(input.forwardedToVendorMinor), reference: input.reference, notes: input.notes, orderIds: json(input.orderIds), createdBy: session.principal.userId } });
      await transaction.auditLog.create({ data: { actorUserId: session.principal.userId, actorType: "admin", action: "logistics.cod_remittance.recorded", resourceType: "cod_remittance", resourceId: row.id, before: Prisma.JsonNull, after: json({ courierPartnerId: row.courierPartnerId, courierName: row.courierName, collectedAmountMinor: row.collectedAmountMinor.toString(), remittedAmountMinor: row.remittedAmountMinor.toString(), forwardedToVendorMinor: row.forwardedToVendorMinor.toString(), reference: row.reference, orderIds: row.orderIds }) } });
      return this.remittanceDto(row);
    });
  }
  async scheduleReattempt(session: Session, shipmentId: string, input: FailedDeliveryReattempt) {
    requireOperator(session, true);
    return withSerializableTransaction(this.client, async (transaction) => {
      const shipment = await transaction.shipment.findUnique({ where: { id: shipmentId }, include: { failedDelivery: true } });
      if (!shipment || !shipment.failedDelivery) throw new ApiProblem(404, "FAILED_DELIVERY_NOT_FOUND", "Failed delivery record not found");
      if (shipment.status !== "FAILED" || !["pending", "vendor_reported"].includes(shipment.failedDelivery.resolution)) throw new ApiProblem(409, "REATTEMPT_NOT_ALLOWED", "Only an unresolved failed delivery can be rescheduled");
      const occurredAt = new Date();
      const row = await transaction.failedDeliveryRecord.update({ where: { shipmentId }, data: { nextAttemptAt: new Date(input.nextAttemptAt), redeliveryFeeMinor: BigInt(input.redeliveryFeeMinor), reason: input.reason, note: input.note, resolution: "reattempt_scheduled" } });
      await transaction.shipment.update({ where: { id: shipmentId }, data: { status: "READY_TO_SHIP", events: { create: { status: "READY_TO_SHIP", description: input.reason, occurredAt } } } });
      await transaction.auditLog.create({ data: { actorUserId: session.principal.userId, actorType: "admin", action: "logistics.failed_delivery.reattempt_scheduled", resourceType: "shipment", resourceId: shipmentId, before: json({ status: shipment.status, resolution: shipment.failedDelivery.resolution }), after: json({ status: "READY_TO_SHIP", resolution: "reattempt_scheduled", ...input }) } });
      return row;
    });
  }
  async returnToSeller(session: Session, shipmentId: string, input: FailedDeliveryReturn) {
    requireOperator(session, true);
    return withSerializableTransaction(this.client, async (transaction) => {
      const shipment = await transaction.shipment.findUnique({ where: { id: shipmentId }, include: { failedDelivery: true } });
      if (!shipment || !shipment.failedDelivery) throw new ApiProblem(404, "FAILED_DELIVERY_NOT_FOUND", "Failed delivery record not found");
      if (shipment.status !== "FAILED" || !["pending", "vendor_reported"].includes(shipment.failedDelivery.resolution)) throw new ApiProblem(409, "RETURN_TO_SELLER_NOT_ALLOWED", "Only an unresolved failed delivery can be returned to seller");
      const occurredAt = new Date();
      const row = await transaction.failedDeliveryRecord.update({ where: { shipmentId }, data: { returnFeeMinor: BigInt(input.returnFeeMinor), reason: input.reason, note: input.note, resolution: "return_to_seller" } });
      await transaction.shipment.update({ where: { id: shipmentId }, data: { status: "CANCELLED", events: { create: { status: "CANCELLED", description: input.reason, providerPayload: json({ logisticsState: "return_to_seller" }), occurredAt } } } });
      await transaction.auditLog.create({ data: { actorUserId: session.principal.userId, actorType: "admin", action: "logistics.failed_delivery.return_to_seller", resourceType: "shipment", resourceId: shipmentId, before: json({ status: shipment.status, resolution: shipment.failedDelivery.resolution }), after: json({ status: "CANCELLED", resolution: "return_to_seller", ...input }) } });
      return row;
    });
  }

  private feeRuleDto(row: Awaited<ReturnType<PrismaClient["deliveryFeeRule"]["findFirstOrThrow"]>>) { return { ...row, minOrderAmountMinor: row.minOrderAmountMinor.toString(), maxOrderAmountMinor: row.maxOrderAmountMinor.toString(), baseFeeMinor: row.baseFeeMinor.toString(), perItemFeeMinor: row.perItemFeeMinor.toString(), feePerKgMinor: row.feePerKgMinor.toString(), codFeeMinor: row.codFeeMinor.toString(), redeliveryFeeMinor: row.redeliveryFeeMinor.toString(), freeShippingThreshold: row.freeShippingThreshold.toString() }; }
  private remittanceDto(row: { id: string; courierPartnerId: string | null; courierName: string; collectedAmountMinor: bigint; remittedAmountMinor: bigint; forwardedToVendorMinor: bigint; reference: string | null; notes: string | null; orderIds: Prisma.JsonValue; createdBy: string; createdAt: Date; courierPartner?: unknown }) { return { ...row, collectedAmountMinor: row.collectedAmountMinor.toString(), remittedAmountMinor: row.remittedAmountMinor.toString(), forwardedToVendorMinor: row.forwardedToVendorMinor.toString(), createdAt: row.createdAt.toISOString() }; }
}
