import type { ParentOrderStatus, PrismaClient } from "@prisma/client";
import { canTransitionParentOrder } from "@amiyo/domain";
import { withSerializableTransaction } from "../../infrastructure/database/transaction.js";
import { OutboxRepository } from "../outbox/outbox.repository.js";

type TransitionOrderInput = {
  orderId: string;
  expectedVersion: number;
  toStatus: ParentOrderStatus;
  actorType: string;
  actorId?: string;
  reason?: string;
};

export class OrderStateRepository {
  private readonly outbox = new OutboxRepository();

  constructor(private readonly client: PrismaClient) {}

  transition(input: TransitionOrderInput) {
    return withSerializableTransaction(this.client, async (transaction) => {
      const current = await transaction.order.findUniqueOrThrow({ where: { id: input.orderId }, select: { status: true, version: true } });
      if (current.version !== input.expectedVersion) throw new Error("ORDER_VERSION_CONFLICT");
      if (!canTransitionParentOrder(current.status, input.toStatus)) throw new Error("ORDER_STATUS_TRANSITION_INVALID");

      const updated = await transaction.order.update({
        where: { id: input.orderId, version: input.expectedVersion },
        data: { status: input.toStatus, version: { increment: 1 } }
      });
      await transaction.orderStatusEvent.create({
        data: {
          orderId: input.orderId,
          fromStatus: current.status,
          toStatus: input.toStatus,
          actorType: input.actorType,
          ...(input.actorId ? { actorId: input.actorId } : {}),
          ...(input.reason ? { reason: input.reason } : {})
        }
      });
      await this.outbox.enqueue(transaction, {
        aggregateType: "order",
        aggregateId: input.orderId,
        eventType: "order.status.changed",
        idempotencyKey: `order-status:${input.orderId}:${updated.version}`,
        payload: { from: current.status, to: input.toStatus, version: updated.version }
      });
      return updated;
    });
  }
}
