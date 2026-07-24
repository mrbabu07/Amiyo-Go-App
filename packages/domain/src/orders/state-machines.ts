export const parentOrderStatuses = [
  "PENDING_PAYMENT",
  "CONFIRMED",
  "PROCESSING",
  "READY_TO_SHIP",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
  "RETURN_REQUESTED",
  "RETURNED",
  "REFUNDED"
] as const;

export const vendorOrderStatuses = [
  "PENDING",
  "ACCEPTED",
  "PROCESSING",
  "PACKED",
  "READY_TO_SHIP",
  "PICKUP_READY",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
  "RETURN_REQUESTED",
  "RETURNED",
  "REFUNDED"
] as const;

export type ParentOrderStatus = (typeof parentOrderStatuses)[number];
export type VendorOrderStatus = (typeof vendorOrderStatuses)[number];

const parentTransitions: Record<ParentOrderStatus, ParentOrderStatus[]> = {
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

const vendorTransitions: Record<VendorOrderStatus, VendorOrderStatus[]> = {
  PENDING: ["ACCEPTED", "PROCESSING", "CANCELLED"],
  ACCEPTED: ["PROCESSING", "CANCELLED"],
  PROCESSING: ["PACKED", "READY_TO_SHIP", "CANCELLED"],
  PACKED: ["READY_TO_SHIP", "CANCELLED"],
  READY_TO_SHIP: ["PICKUP_READY", "SHIPPED", "CANCELLED"],
  PICKUP_READY: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["DELIVERED"],
  DELIVERED: ["RETURN_REQUESTED"],
  RETURN_REQUESTED: ["RETURNED"],
  RETURNED: ["REFUNDED"],
  REFUNDED: [],
  CANCELLED: []
};

export function canTransitionParentOrder(from: ParentOrderStatus, to: ParentOrderStatus) {
  return parentTransitions[from].includes(to);
}

export function canTransitionVendorOrder(from: VendorOrderStatus, to: VendorOrderStatus) {
  return vendorTransitions[from].includes(to);
}

export function deliveryOutboxKey(orderId: string) {
  return `delivery-create:${orderId}`;
}
