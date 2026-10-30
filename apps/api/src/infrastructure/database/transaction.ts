import { Prisma, type PrismaClient } from "@prisma/client";

export type TransactionClient = Prisma.TransactionClient;

export function isRetryableTransactionConflict(error: unknown) {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) return false;
  if (error.code === "P2034") return true;
  if (error.code !== "P2010") return false;
  const databaseCode = typeof error.meta?.code === "string" ? error.meta.code : "";
  return databaseCode === "40001" || databaseCode === "40P01";
}

export async function withSerializableTransaction<Result>(
  client: PrismaClient,
  operation: (transaction: TransactionClient) => Promise<Result>
) {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      return await client.$transaction(operation, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        maxWait: 10_000,
        timeout: 60_000
      });
    } catch (error) {
      if (!isRetryableTransactionConflict(error) || attempt === 3) throw error;
      await new Promise((resolve) => setTimeout(resolve, attempt * 25));
    }
  }
  throw new Error("Serializable transaction retry limit exceeded");
}
