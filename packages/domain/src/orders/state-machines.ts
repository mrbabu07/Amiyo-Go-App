export const parentOrderStatuses = [
  "PENDING_PAYMENT", "CONFIRMED", "PROCESSING", "READY_TO_SHIP", "SHIPPED", "DELIVERED", "CANCELLED", "RETURN_REQUESTED", "RETURNED", "REFUNDED"
] as const;

export const vendorOrderStatuses = [
  "PLACED", "ACCEPTED", "REJECTED", "PROCESSING", "READY_TO_SHIP", "PICKED_UP", "IN_TRANSIT", "DELIVERED", "CANCELLED"
] as const;

export const paymentStatuses = [
  "INITIATED", "REQUIRES_ACTION", "AUTHORIZED", "CAPTURED", "PARTIALLY_REFUNDED", "REFUNDED", "FAILED", "CANCELLED", "EXPIRED"
] as const;

export const returnStatuses = [
  "REQUESTED", "REVIEWING", "APPROVED", "REJECTED", "PICKUP_SCHEDULED", "RECEIVED", "INSPECTED", "REFUND_PENDING", "REFUNDED", "CLOSED"
] as const;

export type ParentOrderStatus = (typeof parentOrderStatuses)[number];
export type VendorOrderStatus = (typeof vendorOrderStatuses)[number];
export type PaymentStatus = (typeof paymentStatuses)[number];
export type ReturnStatus = (typeof returnStatuses)[number];

const parentTransitions: Record<ParentOrderStatus, readonly ParentOrderStatus[]> = {
  PENDING_PAYMENT: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PROCESSING", "CANCELLED"],
  PROCESSING: ["READY_TO_SHIP", "CANCELLED"],
  READY_TO_SHIP: ["SHIPPED"],
  SHIPPED: ["DELIVERED"],
  DELIVERED: ["RETURN_REQUESTED"],
  RETURN_REQUESTED: ["RETURNED"],
  RETURNED: ["REFUNDED"],
  REFUNDED: [],
  CANCELLED: []
};

const vendorTransitions: Record<VendorOrderStatus, readonly VendorOrderStatus[]> = {
  PLACED: ["ACCEPTED", "REJECTED", "CANCELLED"],
  ACCEPTED: ["PROCESSING", "CANCELLED"],
  REJECTED: [],
  PROCESSING: ["READY_TO_SHIP", "CANCELLED"],
  READY_TO_SHIP: ["PICKED_UP"],
  PICKED_UP: ["IN_TRANSIT"],
  IN_TRANSIT: ["DELIVERED"],
  DELIVERED: [],
  CANCELLED: []
};

const paymentTransitions: Record<PaymentStatus, readonly PaymentStatus[]> = {
  INITIATED: ["REQUIRES_ACTION", "AUTHORIZED", "FAILED", "CANCELLED", "EXPIRED"],
  REQUIRES_ACTION: ["AUTHORIZED", "FAILED", "CANCELLED", "EXPIRED"],
  AUTHORIZED: ["CAPTURED", "FAILED", "CANCELLED", "EXPIRED"],
  CAPTURED: ["PARTIALLY_REFUNDED", "REFUNDED"],
  PARTIALLY_REFUNDED: ["PARTIALLY_REFUNDED", "REFUNDED"],
  REFUNDED: [],
  FAILED: [],
  CANCELLED: [],
  EXPIRED: []
};

const returnTransitions: Record<ReturnStatus, readonly ReturnStatus[]> = {
  REQUESTED: ["REVIEWING"],
  REVIEWING: ["APPROVED", "REJECTED"],
  APPROVED: ["PICKUP_SCHEDULED"],
  REJECTED: ["CLOSED"],
  PICKUP_SCHEDULED: ["RECEIVED"],
  RECEIVED: ["INSPECTED"],
  INSPECTED: ["REFUND_PENDING", "CLOSED"],
  REFUND_PENDING: ["REFUNDED"],
  REFUNDED: ["CLOSED"],
  CLOSED: []
};

export function canTransitionParentOrder(from: ParentOrderStatus, to: ParentOrderStatus) {
  return parentTransitions[from].includes(to);
}

export function canTransitionVendorOrder(from: VendorOrderStatus, to: VendorOrderStatus) {
  return vendorTransitions[from].includes(to);
}

export function canTransitionPayment(from: PaymentStatus, to: PaymentStatus) {
  return paymentTransitions[from].includes(to);
}

export function canTransitionReturn(from: ReturnStatus, to: ReturnStatus) {
  return returnTransitions[from].includes(to);
}

export function deliveryOutboxKey(vendorOrderId: string) {
  return `delivery-create:${vendorOrderId}`;
}
