import assert from "node:assert/strict";
import test from "node:test";
import type { PrismaClient } from "@prisma/client";
import { EngagementService } from "./engagement.service.js";

test("removing a price or stock alert is owner-scoped and preserves the other kind", async () => {
  const filters: unknown[] = [];
  const client = { stockAlert: {
    updateMany: async ({ where }: { where: unknown }) => { filters.push(where); return { count: 1 }; },
    findMany: async () => []
  } } as unknown as PrismaClient;
  const service = new EngagementService(client);
  await service.removeAlert("owner", "product", "stock");
  await service.removeAlert("owner", "product", "price");
  await service.removeAlert("owner", "product");
  assert.deepEqual(filters, [
    { userId: "owner", productId: "product", targetMinor: null },
    { userId: "owner", productId: "product", targetMinor: { not: null } },
    { userId: "owner", productId: "product" }
  ]);
});
