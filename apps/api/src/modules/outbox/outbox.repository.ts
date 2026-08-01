import type { Prisma } from "@prisma/client";
import type { TransactionClient } from "../../infrastructure/database/transaction.js";

export type EnqueueOutboxInput = {
  aggregateType: string;
  aggregateId: string;
  eventType: string;
  idempotencyKey: string;
  payload: Prisma.InputJsonValue;
};

export class OutboxRepository {
  enqueue(transaction: TransactionClient, input: EnqueueOutboxInput) {
    return transaction.outboxEvent.create({ data: input });
  }
}
