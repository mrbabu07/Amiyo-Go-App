export const orderFilters = [
  { label: "All", value: "ALL" },
  { label: "Pending", value: "PENDING" },
  { label: "Processing", value: "PROCESSING" },
  { label: "Shipped", value: "SHIPPED" },
  { label: "Delivered", value: "DELIVERED" },
  { label: "Cancelled", value: "CANCELLED" },
  { label: "Return / refund", value: "RETURN" }
] as const;
export type OrderFilter = typeof orderFilters[number]["value"];

export function orderStatusGroup(status: string): Exclude<OrderFilter, "ALL"> | null {
  if (["RETURN_REQUESTED", "RETURNED", "REFUNDED"].includes(status)) return "RETURN";
  if (["PENDING_PAYMENT", "CONFIRMED"].includes(status)) return "PENDING";
  if (["PROCESSING", "READY_TO_SHIP"].includes(status)) return "PROCESSING";
  if (status === "SHIPPED") return "SHIPPED";
  if (status === "DELIVERED") return "DELIVERED";
  if (status === "CANCELLED") return "CANCELLED";
  return null;
}

export function orderProgressStep(status: string): number | null {
  if (orderStatusGroup(status) === "PENDING") return 0;
  if (orderStatusGroup(status) === "PROCESSING") return 1;
  if (status === "SHIPPED") return 2;
  if (status === "DELIVERED") return 3;
  return null;
}
