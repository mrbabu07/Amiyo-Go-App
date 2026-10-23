export function cancellationState(order: { cancellation?: { deadline: string; windowMinutes: number }; status: string; vendorOrders: Array<{ status: string }> }, now: number) {
  const remainingMs = order.cancellation ? new Date(order.cancellation.deadline).getTime() - now : Number.NaN;
  const statusAllowsCancel = ["PENDING_PAYMENT", "CONFIRMED", "PROCESSING"].includes(order.status)
    && order.vendorOrders.every((entry) => ["PLACED", "ACCEPTED", "PROCESSING"].includes(entry.status));
  return { remainingMs, statusAllowsCancel, windowMinutes: order.cancellation?.windowMinutes ?? null, cancellable: Number.isFinite(remainingMs) && statusAllowsCancel && remainingMs > 0 };
}
