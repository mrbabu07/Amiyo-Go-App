export const orderFilters = [
  { label: "All", value: "ALL" },
  { label: "To Pay", value: "TO_PAY" },
  { label: "Processing", value: "PROCESSING" },
  { label: "Shipped", value: "SHIPPED" },
  { label: "Delivered", value: "DELIVERED" },
  { label: "Cancelled", value: "CANCELLED" },
  { label: "Return / refund", value: "RETURN" }
] as const;
export type OrderFilter = typeof orderFilters[number]["value"];

export function orderStatusGroup(status: string): Exclude<OrderFilter, "ALL"> | null {
  if (["RETURN_REQUESTED", "RETURNED", "REFUNDED"].includes(status)) return "RETURN";
  if (status === "PENDING_PAYMENT") return "TO_PAY";
  if (["CONFIRMED", "PROCESSING", "READY_TO_SHIP"].includes(status)) return "PROCESSING";
  if (status === "SHIPPED") return "SHIPPED";
  if (status === "DELIVERED") return "DELIVERED";
  if (status === "CANCELLED") return "CANCELLED";
  return null;
}

export function orderProgressStep(status: string): number | null {
  if (["PENDING_PAYMENT", "CONFIRMED"].includes(status)) return 0;
  if (["PROCESSING", "READY_TO_SHIP"].includes(status)) return 1;
  if (status === "SHIPPED") return 2;
  if (status === "DELIVERED") return 3;
  return null;
}
