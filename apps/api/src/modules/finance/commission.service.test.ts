import assert from "node:assert/strict";
import test from "node:test";
import type { Prisma, PrismaClient } from "@prisma/client";
import { CommissionService } from "./commission.service.js";

test("commission calculation applies the most specific active rule", async () => {
  const now = new Date(Date.now() - 60_000);
  const rules = [
    { id: "11111111-1111-4111-8111-111111111111", vendorId: null, categoryId: null, rateBps: 500, fixedMinor: 0n, currency: "BDT", effectiveFrom: now, effectiveTo: null, version: 1 },
    { id: "22222222-2222-4222-8222-222222222222", vendorId: "33333333-3333-4333-8333-333333333333", categoryId: "44444444-4444-4444-8444-444444444444", rateBps: 1000, fixedMinor: 100n, currency: "BDT", effectiveFrom: now, effectiveTo: null, version: 1 }
  ];
  const entries: Array<{ amountMinor: bigint; ruleId: string }> = [];
  const transaction = { commissionRule: { findMany: async () => rules }, commissionEntry: { create: async ({ data }: { data: { amountMinor: bigint; ruleId: string } }) => { entries.push(data); return data; } } } as unknown as Prisma.TransactionClient;
  const service = new CommissionService({} as PrismaClient);
  const amount = await service.calculateForVendorOrder(transaction, "55555555-5555-4555-8555-555555555555", "33333333-3333-4333-8333-333333333333", [{ productId: "66666666-6666-4666-8666-666666666666", categoryId: "44444444-4444-4444-8444-444444444444", quantity: 2, unitPriceMinor: 10_000n }]);
  assert.equal(amount, 2_100n);
  assert.deepEqual(entries.map((entry) => entry.ruleId), [rules[1]!.id]);
});

test("commission calculation caps deductions at the vendor subtotal", async () => {
  const rules = [{ id: "11111111-1111-4111-8111-111111111111", vendorId: null, categoryId: null, rateBps: 5000, fixedMinor: 100_000n, currency: "BDT", effectiveFrom: new Date(), effectiveTo: null, version: 1 }];
  const transaction = { commissionRule: { findMany: async () => rules }, commissionEntry: { create: async ({ data }: { data: { amountMinor: bigint } }) => data } } as unknown as Prisma.TransactionClient;
  const amount = await new CommissionService({} as PrismaClient).calculateForVendorOrder(transaction, "22222222-2222-4222-8222-222222222222", "33333333-3333-4333-8333-333333333333", [{ productId: "44444444-4444-4444-8444-444444444444", categoryId: "55555555-5555-4555-8555-555555555555", quantity: 1, unitPriceMinor: 10_000n }]);
  assert.equal(amount, 10_000n);
});
