import { Prisma, type PrismaClient } from "@prisma/client";

export type TransactionClient = Prisma.TransactionClient;

export async function withSerializableTransaction<Result>(
  client: PrismaClient,
  operation: (transaction: TransactionClient) => Promise<Result>
) {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      return await client.$transaction(operation, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        maxWait: 5_000,
        timeout: 15_000
      });
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2034" || attempt === 3) throw error;
      await new Promise((resolve) => setTimeout(resolve, attempt * 25));
    }
  }
  throw new Error("Serializable transaction retry limit exceeded");
}
