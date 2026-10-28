const rejectedBeforeWrite = new Set([
  "VENDOR_ORDER_FORBIDDEN",
  "VENDOR_ORDER_NOT_FOUND",
  "VENDOR_ORDER_REASON_REQUIRED",
  "COURIER_TRANSITION_FORBIDDEN",
  "ORDER_PAYMENT_PENDING",
  "VENDOR_ORDER_VERSION_CONFLICT",
  "VENDOR_ORDER_TRANSITION_INVALID",
  "PACKAGE_RESERVATION_INCONSISTENT",
  "INVENTORY_RESERVATION_CHANGED",
  "INVENTORY_RESERVATION_INCONSISTENT"
]);

export const mayDiscardVendorTransition = (fresh: boolean, status: number, code: string) => fresh && [400, 403, 404, 409].includes(status) && rejectedBeforeWrite.has(code);
