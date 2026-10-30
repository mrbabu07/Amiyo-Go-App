import assert from "node:assert/strict";
import test from "node:test";
import { Prisma } from "@prisma/client";
import { isRetryableTransactionConflict, withSerializableTransaction } from "./transaction.js";

function known(code: string, meta?: Record<string, unknown>) {
  return new Prisma.PrismaClientKnownRequestError("database conflict", { code, clientVersion: "5.22.0", ...(meta ? { meta } : {}) });
}

test("serializable transactions recognize Prisma and PostgreSQL conflict shapes", () => {
  assert.equal(isRetryableTransactionConflict(known("P2034")), true);
  assert.equal(isRetryableTransactionConflict(known("P2010", { code: "40001" })), true);
  assert.equal(isRetryableTransactionConflict(known("P2010", { code: "40P01" })), true);
  assert.equal(isRetryableTransactionConflict(known("P2010", { code: "23505" })), false);
});

test("serializable transactions retry a raw PostgreSQL serialization conflict", async () => {
  let attempts = 0;
  const client = { $transaction: async (operation: (transaction: object) => Promise<string>) => {
    attempts += 1;
    if (attempts === 1) throw known("P2010", { code: "40001" });
    return operation({});
  } };

  const result = await withSerializableTransaction(client as never, async () => "committed");
  assert.equal(result, "committed");
  assert.equal(attempts, 2);
});
