import { randomUUID } from "node:crypto";
import type { PrismaClient } from "@prisma/client";

export async function upsertProductAlert(client: PrismaClient, userId: string, productId: string, targetMinor: bigint | null) {
  const id = randomUUID();
  if (targetMinor === null) {
    await client.$executeRaw`INSERT INTO stock_alerts (id, user_id, product_id, target_minor, active)
      VALUES (${id}::uuid, ${userId}::uuid, ${productId}::uuid, NULL, true)
      ON CONFLICT (user_id, product_id) WHERE target_minor IS NULL
      DO UPDATE SET active = true`;
  } else {
    await client.$executeRaw`INSERT INTO stock_alerts (id, user_id, product_id, target_minor, active)
      VALUES (${id}::uuid, ${userId}::uuid, ${productId}::uuid, ${targetMinor}::bigint, true)
      ON CONFLICT (user_id, product_id) WHERE target_minor IS NOT NULL
      DO UPDATE SET target_minor = EXCLUDED.target_minor, active = true`;
  }
}
