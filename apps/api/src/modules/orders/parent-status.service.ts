import type { ParentOrderStatus, Prisma } from "@prisma/client";
import { canTransitionParentOrder, deriveParentOrderStatus } from "@amiyo/domain";
import { OutboxRepository } from "../outbox/outbox.repository.js";

const sequence: ParentOrderStatus[] = ["CONFIRMED", "PROCESSING", "READY_TO_SHIP", "SHIPPED", "DELIVERED"];

export async function synchronizeParentOrderStatus(transaction: Prisma.TransactionClient, orderId: string, actorType: string, actorId?: string) {
  const order = await transaction.order.findUniqueOrThrow({ where: { id: orderId }, include: { vendorOrders: { select: { status: true } } } });
  if (order.status === "PENDING_PAYMENT") return order;
  const target = deriveParentOrderStatus(order.vendorOrders.map(({ status }) => status));
  if (target === order.status) return order;
  const outbox = new OutboxRepository();
  const targets = target === "CANCELLED" ? [target] : sequence.slice(sequence.indexOf(order.status) + 1, sequence.indexOf(target) + 1);
  let current = order;
  for (const next of targets) {
    if (!canTransitionParentOrder(current.status, next)) continue;
    const updated = await transaction.order.update({ where: { id: orderId, version: current.version }, data: { status: next, version: { increment: 1 } } });
    await transaction.orderStatusEvent.create({ data: { orderId, fromStatus: current.status, toStatus: next, actorType, ...(actorId ? { actorId } : {}) } });
    await outbox.enqueue(transaction, { aggregateType: "order", aggregateId: orderId, eventType: "order.status.changed", idempotencyKey: `order-status:${orderId}:${updated.version}`, payload: { from: current.status, to: next, version: updated.version } });
    current = { ...current, ...updated };
  }
  return current;
}
