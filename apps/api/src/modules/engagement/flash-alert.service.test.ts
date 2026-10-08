import assert from "node:assert/strict";
import test from "node:test";
import type { PrismaClient } from "@prisma/client";
import { FlashAlertService } from "./flash-alert.service.js";

test("flash alert writes and reads are owner scoped and do not change stock or price rules", async () => {
  const mutations: unknown[] = [];
  const reads: unknown[] = [];
  const client = {
    product: { findFirst: async ({ where }: { where: unknown }) => { assert.deepEqual(where, { id: "product", status: "APPROVED", shop: { status: "ACTIVE" }, vendor: { status: "APPROVED" } }); return { id: "product" }; } },
    flashSaleAlert: {
      upsert: async (input: unknown) => { mutations.push(input); },
      updateMany: async (input: unknown) => { mutations.push(input); },
      findMany: async ({ where }: { where: unknown }) => { reads.push(where); return []; }
    }
  } as unknown as PrismaClient;
  const service = new FlashAlertService(client);
  await service.save("owner", "product");
  await service.remove("owner", "product");
  assert.deepEqual(mutations, [
    { where: { userId_productId: { userId: "owner", productId: "product" } }, create: { userId: "owner", productId: "product" }, update: { active: true } },
    { where: { userId: "owner", productId: "product" }, data: { active: false } }
  ]);
  assert.deepEqual(reads, [{ userId: "owner", active: true }, { userId: "owner", active: true }]);
});

test("unavailable products cannot acquire a flash subscription", async () => {
  const client = { product: { findFirst: async () => null } } as unknown as PrismaClient;
  await assert.rejects(new FlashAlertService(client).save("owner", "hidden"), /Product not found/);
});
