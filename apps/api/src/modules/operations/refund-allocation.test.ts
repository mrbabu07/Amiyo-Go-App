import assert from "node:assert/strict";
import test from "node:test";
import type { Prisma } from "@prisma/client";
import { allocateOrderRefund, assertRefundAccountingHistory, reverseSellerSettlement } from "./refund-allocation.js";

function fixture(settled = true, credit = 90n) {
  const ledger: Array<{ accountType: string; accountId: string; amountMinor: bigint; idempotencyKey: string }> = [];
  const debits: Array<{ amountMinor: bigint }> = [];
  const transaction = {
    financialLedgerEntry: {
      aggregate: async ({ where }: { where: { accountId: string } }) => ({ _sum: { amountMinor: ledger.filter((entry) => entry.accountType === "vendor_refund_allocation" && entry.accountId === where.accountId).reduce((total, entry) => total + entry.amountMinor, 0n) } }),
      findUnique: async ({ where }: { where: { idempotencyKey: string } }) => ledger.find((entry) => entry.idempotencyKey === where.idempotencyKey) ?? null,
      create: async ({ data }: { data: typeof ledger[number] }) => { ledger.push(data); return data; }
    },
    vendorLedgerEntry: {
      findFirst: async () => null,
      findUnique: async () => settled ? { id: "settlement", walletId: "wallet", direction: "CREDIT", currency: "BDT", amountMinor: credit, metadata: { commissionMinor: "10", vendorId: "vendor", netBaseMinor: "90", commissionBaseMinor: "10" } } : null,
      create: async ({ data }: { data: { amountMinor: bigint } }) => { debits.push(data); return data; }
    }
  } as unknown as Prisma.TransactionClient;
  return { transaction, ledger, debits };
}

test("partial refunds cumulatively reverse exact seller net and commission, with replay safety", async () => {
  const state = fixture();
  for (const [index, amountMinor] of [33n, 33n, 34n].entries()) {
    const input = { packageId: "package", packageTotalMinor: 100n, amountMinor, currency: "BDT", refundId: `refund-${index}` };
    await reverseSellerSettlement(state.transaction, input);
    await reverseSellerSettlement(state.transaction, input);
  }
  assert.deepEqual(state.debits.map((entry) => entry.amountMinor), [29n, 30n, 31n]);
  assert.equal(state.ledger.filter((entry) => entry.accountType === "platform_commission").reduce((total, entry) => total + entry.amountMinor, 0n), 10n);
  await assert.rejects(reverseSellerSettlement(state.transaction, { packageId: "package", packageTotalMinor: 100n, amountMinor: 1n, currency: "BDT", refundId: "excess" }), /exceeds/);
});

test("unsettled refunds do not debit wallets or reverse unearned commission", async () => {
  const state = fixture(false);
  await reverseSellerSettlement(state.transaction, { packageId: "package", packageTotalMinor: 100n, amountMinor: 30n, currency: "BDT", refundId: "refund" });
  assert.equal(state.debits.length, 0);
  assert.equal(state.ledger.length, 1);
  assert.equal(state.ledger[0]?.accountType, "vendor_refund_allocation");
});

test("multi-store allocation uses remaining capacity and preserves rounding without overcharging", async () => {
  const state = fixture(false);
  await reverseSellerSettlement(state.transaction, { packageId: "first", packageTotalMinor: 60n, amountMinor: 60n, currency: "BDT", refundId: "return" });
  const shares = await allocateOrderRefund(state.transaction, [{ id: "second", totalMinor: 40n }, { id: "first", totalMinor: 60n }], 40n, "BDT");
  assert.deepEqual(shares, [{ id: "first", amountMinor: 0n }, { id: "second", amountMinor: 40n }]);
  const large = 9007199254740993n;
  const split = await allocateOrderRefund(fixture(false).transaction, [{ id: "first", totalMinor: large }, { id: "second", totalMinor: large }], large, "BDT");
  assert.equal(split.reduce((total, entry) => total + entry.amountMinor, 0n), large);
});

test("refund after a partially refunded settlement reverses only the remaining net", async () => {
  const state = fixture(true, 61n);
  state.ledger.push({ accountType: "vendor_refund_allocation", accountId: "package", amountMinor: 33n, idempotencyKey: "earlier-refund" });
  await reverseSellerSettlement(state.transaction, { packageId: "package", packageTotalMinor: 100n, amountMinor: 67n, currency: "BDT", refundId: "later" });
  assert.equal(state.debits[0]?.amountMinor, 61n);
  assert.equal(state.ledger.find((entry) => entry.accountType === "platform_commission")?.amountMinor, 7n);
});

test("legacy gross refund debits block automatic reconciliation", async () => {
  const transaction = { refund: { findMany: async () => [{ id: "old-refund", returnId: "old-return" }] }, vendorLedgerEntry: { findFirst: async () => ({ id: "old-debit" }) } } as unknown as Prisma.TransactionClient;
  await assert.rejects(assertRefundAccountingHistory(transaction, "order"), /Legacy gross seller debits/);
});
