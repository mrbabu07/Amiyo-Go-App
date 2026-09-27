import assert from "node:assert/strict";
import test from "node:test";
import type { Session } from "@amiyo/contracts";
import { VendorCommissionInvoiceService } from "./vendor-commission-invoice.service.js";

const vendorId = "11111111-1111-4111-8111-111111111111";
const session = { status: "ACTIVE", permissions: ["finance:read"], principal: { vendorIds: [vendorId] } } as Session;
const settlement = { id: "entry", createdAt: new Date("2026-09-10"), referenceId: "package", metadata: { commissionMinor: "9007199254740993", vendorId } };

function fixture(settlements = [settlement], reversal = 0n) {
  const transaction = {
    vendor: { findUnique: async () => ({ displayName: "Seller" }) },
    vendorWallet: { findUnique: async () => ({ id: "wallet", currency: "BDT" }) },
    vendorLedgerEntry: { findMany: async ({ where, take }: { where: { walletId: string; createdAt: { gte: Date; lt: Date }; entryType: string }; take: number }) => {
      assert.equal(where.walletId, "wallet"); assert.equal(where.entryType, "ORDER_SETTLEMENT"); assert.equal(take, 5001);
      assert.equal(where.createdAt.gte.toISOString(), "2026-08-31T18:00:00.000Z"); assert.equal(where.createdAt.lt.toISOString(), "2026-09-30T18:00:00.000Z");
      return settlements;
    } },
    financialLedgerEntry: { findMany: async ({ where }: { where: { accountId: string; entryType: string } }) => { assert.equal(where.accountId, vendorId); assert.equal(where.entryType, "COMMISSION_REVERSAL"); return reversal ? [{ id: "reversal", createdAt: new Date("2026-09-11"), referenceId: "refund", amountMinor: reversal }] : []; } }
  };
  return new VendorCommissionInvoiceService({ $transaction: async (callback: (client: typeof transaction) => Promise<unknown>) => callback(transaction) } as never);
}

test("commission invoice denies another vendor and missing finance permission", async () => {
  const service = new VendorCommissionInvoiceService({} as never);
  await assert.rejects(service.invoice({ ...session, permissions: [] }, { month: "2026-09" }), /permission/);
  await assert.rejects(service.invoice(session, { month: "2026-09", vendorId: "22222222-2222-4222-8222-222222222222" }), /workspace/);
});

test("commission invoice uses approved snapshots, exact integers and reversal posting month", async () => {
  const invoice = await fixture([settlement], 3n).invoice(session, { month: "2026-09" });
  assert.equal(invoice.net.amountMinor, "9007199254740990");
  assert.equal(invoice.entries.length, 2);
  const reversalOnly = await fixture([], 100n).invoice(session, { month: "2026-09" });
  assert.equal(reversalOnly.net.amountMinor, "-100");
});

test("commission invoice rejects missing snapshots and overflow instead of fabricating amounts", async () => {
  await assert.rejects(fixture([{ ...settlement, metadata: { commissionMinor: "invalid", vendorId } }]).invoice(session, { month: "2026-09" }), /snapshot/);
  await assert.rejects(fixture(Array(5001).fill(settlement)).invoice(session, { month: "2026-09" }), /no partial/);
  assert.equal((await fixture([]).invoice(session, { month: "2026-09" })).net.amountMinor, "0");
});
