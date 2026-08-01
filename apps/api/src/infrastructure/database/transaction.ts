import { Prisma, type PrismaClient } from "@prisma/client";

export type TransactionClient = Prisma.TransactionClient;

export function withSerializableTransaction<Result>(
  client: PrismaClient,
  operation: (transaction: TransactionClient) => Promise<Result>
) {
  return client.$transaction(operation, {
    isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    maxWait: 5_000,
    timeout: 15_000
  });
}
