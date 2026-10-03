export function cancellationState(order: { createdAt: string; placedAt?: string | null; status: string; vendorOrders: Array<{ status: string }> }, now: number) {
  const remainingMs = new Date(order.placedAt ?? order.createdAt).getTime() + 30 * 60_000 - now;
  const statusAllowsCancel = ["PENDING_PAYMENT", "CONFIRMED", "PROCESSING"].includes(order.status)
    && order.vendorOrders.every((entry) => ["PLACED", "ACCEPTED", "PROCESSING"].includes(entry.status));
  return { remainingMs, statusAllowsCancel, cancellable: Number.isFinite(remainingMs) && statusAllowsCancel && remainingMs > 0 };
}
