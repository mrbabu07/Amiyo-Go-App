import assert from "node:assert/strict";
import test from "node:test";
import type { Session } from "@amiyo/contracts";
import { VendorStatementService, statementPeriod } from "./vendor-statement.service.js";

const vendorId = "11111111-1111-4111-8111-111111111111";
const session = { status: "ACTIVE", permissions: ["finance:read"], principal: { vendorIds: [vendorId] } } as Session;

test("statement periods use Dhaka midnight with an exclusive next-month boundary", () => {
  assert.equal(statementPeriod("2026-09").start.toISOString(), "2026-08-31T18:00:00.000Z");
  assert.equal(statementPeriod("2026-12").end.toISOString(), "2026-12-31T18:00:00.000Z");
  assert.equal(statementPeriod("2024-02").end.toISOString(), "2024-02-29T18:00:00.000Z");
  assert.throws(() => statementPeriod("2026-13"));
});

test("statement denies missing permission and other-vendor scope before database access", async () => {
  const service = new VendorStatementService({} as never);
  await assert.rejects(service.statement({ ...session, permissions: [] }, { month: "2026-09" }), /permission/);
  await assert.rejects(service.statement(session, { month: "2026-09", vendorId: "22222222-2222-4222-8222-222222222222" }), /not in your workspace/);
});

test("statement reconciles all period rows and preserves large integer balances", async () => {
  const amount = 9007199254740993n;
  const rows = Array.from({ length: 101 }, (_, index) => ({ id: String(index), direction: "DEBIT", amountMinor: 1n, entryType: "TEST", referenceType: "test", referenceId: "ref", createdAt: new Date("2026-09-02T00:00:00Z") }));
  const transaction = {
    vendor: { findUnique: async () => ({ displayName: "Seller" }) },
    vendorWallet: { findUnique: async () => ({ id: "wallet", currency: "BDT" }) },
    vendorLedgerEntry: {
      groupBy: async (query: { where: { walletId: string; createdAt: { lt: Date } } }) => {
        assert.equal(query.where.walletId, "wallet");
        assert.equal(query.where.createdAt.lt.toISOString(), "2026-08-31T18:00:00.000Z");
        return [{ direction: "CREDIT", _sum: { amountMinor: amount } }];
      },
      findMany: async (query: { where: { createdAt: { gte: Date; lt: Date } }; take: number }) => {
        assert.equal(query.where.createdAt.lt.toISOString(), "2026-09-30T18:00:00.000Z");
        assert.equal(query.take, 5001);
        return rows;
      }
    }
  };
  const service = new VendorStatementService({ $transaction: async (callback: (client: typeof transaction) => Promise<unknown>, options: { isolationLevel: string }) => { assert.equal(options.isolationLevel, "RepeatableRead"); return callback(transaction); } } as never);
  const statement = await service.statement(session, { month: "2026-09" });
  assert.equal(statement.entries.length, 101);
  assert.equal(statement.opening.amountMinor, String(amount));
  assert.equal(statement.closing.amountMinor, String(amount - 101n));
  assert.equal(statement.debits.amountMinor, "101");
  rows.push(...Array.from({ length: 4900 }, () => rows[0]!));
  await assert.rejects(service.statement(session, { month: "2026-09" }), /exceeds 5000/);
});

test("vendor without a wallet receives a zero statement without creating financial records", async () => {
  const transaction = { vendor: { findUnique: async () => ({ displayName: "New seller" }) }, vendorWallet: { findUnique: async () => null } };
  const service = new VendorStatementService({ $transaction: async (callback: (client: typeof transaction) => Promise<unknown>) => callback(transaction) } as never);
  const result = await service.statement(session, { month: "2026-09" });
  assert.equal(result.closing.amountMinor, "0");
  assert.deepEqual(result.entries, []);
});
