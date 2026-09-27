import assert from "node:assert/strict";
import test from "node:test";
import type { Session } from "@amiyo/contracts";
import { OrderSettlementService } from "./order-settlement.service.js";

const session = { status: "ACTIVE", permissions: ["finance:manage"], principal: { userId: "admin", roles: ["FINANCE_ADMIN"] } } as Session;
const approval = { expectedVersion: 1, expectedAmountMinor: "8400", shippingRecipient: "PLATFORM", reason: "Verified seller commission and shipping allocation" };

function fixture() {
  const current = {
    id: "package", vendorId: "vendor", orderId: "order", version: 1, status: "DELIVERED",
    subtotalMinor: 10000n, discountMinor: 1000n, commissionMinor: 600n, deliveryMinor: 500n,
    shipments: [{ status: "DELIVERED", deliveredAt: new Date("2025-01-01") }],
    order: { status: "DELIVERED", currency: "BDT", totalMinor: 9500n, returnWindowUntil: new Date("2025-01-08"), refunds: [] as unknown[], returns: [] as { status: string }[], payments: [{ status: "CAPTURED", refundedMinor: 0n, currency: "BDT", amountMinor: 9500n, method: "COD", codCollection: { collectedMinor: 9500n, reconciliationItems: [{ varianceMinor: 0n, reconciliation: { status: "reconciled" } }] } }] }
  };
  let entry: { id: string; amountMinor: bigint; currency: string } | null = null;
  let writes = 0;
  let audits = 0;
  const transaction = {
    vendorOrder: { findUnique: async () => current },
    platformConfiguration: { findUnique: async () => null },
    vendorWallet: { upsert: async () => ({ id: "wallet", currency: "BDT" }) },
    vendorLedgerEntry: {
      findUnique: async () => entry,
      create: async ({ data }: { data: { amountMinor: bigint; currency: string; idempotencyKey: string; direction: string } }) => { assert.equal(data.direction, "CREDIT"); assert.equal(data.idempotencyKey, "order-settlement:package"); writes++; entry = { id: "entry", amountMinor: data.amountMinor, currency: data.currency }; return entry; }
    },
    auditLog: { create: async () => { audits++; } }
  };
  const service = new OrderSettlementService({ $transaction: async (callback: (client: typeof transaction) => Promise<unknown>, options: { isolationLevel: string }) => { assert.equal(options.isolationLevel, "Serializable"); return callback(transaction); } } as never);
  return { service, current, counts: () => ({ writes, audits }) };
}

test("settlement requires active finance administrator before accessing the database", async () => {
  const service = new OrderSettlementService({} as never);
  await assert.rejects(service.approve({ ...session, permissions: [] }, "package", approval), /administrator/);
  await assert.rejects(service.approve({ ...session, principal: { ...session.principal, roles: ["VENDOR_OWNER"] } }, "package", approval), /administrator/);
  await assert.rejects(service.approve({ ...session, status: "SUSPENDED" } as Session, "package", approval), /administrator/);
});

test("settlement credits exact net once and records approval without sending a payout", async () => {
  const context = fixture();
  const first = await context.service.approve(session, "package", approval);
  assert.equal(first.amountMinor, "8400");
  assert.equal(first.alreadySettled, false);
  const replay = await context.service.approve(session, "package", approval);
  assert.equal(replay.alreadySettled, true);
  assert.deepEqual(context.counts(), { writes: 1, audits: 1 });
});

test("seller shipping allocation requires explicit approval and matching amount", async () => {
  const context = fixture();
  await assert.rejects(context.service.approve(session, "package", { ...approval, shippingRecipient: "VENDOR" }), /amount does not match/);
  assert.deepEqual(context.counts(), { writes: 0, audits: 0 });
  assert.equal((await context.service.approve(session, "package", { ...approval, shippingRecipient: "VENDOR", expectedAmountMinor: "8900" })).amountMinor, "8900");
});

test("settlement refuses undelivered, stale, refunded, disputed and unpaid orders", async () => {
  for (const change of [
    (current: ReturnType<typeof fixture>["current"]) => { current.status = "IN_TRANSIT"; },
    (current: ReturnType<typeof fixture>["current"]) => { current.version = 2; },
    (current: ReturnType<typeof fixture>["current"]) => { current.order.refunds.push({}); },
    (current: ReturnType<typeof fixture>["current"]) => { current.order.returns.push({ status: "REQUESTED" }); },
    (current: ReturnType<typeof fixture>["current"]) => { current.order.payments[0]!.status = "AUTHORIZED"; },
    (current: ReturnType<typeof fixture>["current"]) => { current.order.payments[0]!.codCollection.collectedMinor = 9000n; },
    (current: ReturnType<typeof fixture>["current"]) => { current.order.payments[0]!.codCollection.reconciliationItems = []; },
    (current: ReturnType<typeof fixture>["current"]) => { current.commissionMinor = 10000n; }
  ]) {
    const context = fixture(); change(context.current);
    await assert.rejects(context.service.approve(session, "package", approval));
    assert.deepEqual(context.counts(), { writes: 0, audits: 0 });
  }
});

test("settlement waits for delivery hold and return deadline", async () => {
  const context = fixture();
  context.current.shipments[0]!.deliveredAt = new Date();
  await assert.rejects(context.service.approve(session, "package", approval), /held until/);
  context.current.shipments[0]!.deliveredAt = new Date("2025-01-01");
  context.current.order.returnWindowUntil = new Date(Date.now() + 86400000);
  await assert.rejects(context.service.approve(session, "package", approval), /held until/);
  assert.deepEqual(context.counts(), { writes: 0, audits: 0 });
});

test("settlement preserves bigint precision and refuses missing delivery evidence", async () => {
  const context = fixture();
  context.current.subtotalMinor = 90071992547409930n;
  const expected = context.current.subtotalMinor - context.current.discountMinor - context.current.commissionMinor;
  context.current.order.totalMinor = context.current.subtotalMinor - context.current.discountMinor + context.current.deliveryMinor;
  context.current.order.payments[0]!.amountMinor = context.current.order.totalMinor;
  context.current.order.payments[0]!.codCollection.collectedMinor = context.current.order.totalMinor;
  assert.equal((await context.service.approve(session, "package", { ...approval, expectedAmountMinor: expected.toString() })).amountMinor, expected.toString());
  const missing = fixture();
  missing.current.shipments = [];
  await assert.rejects(missing.service.approve(session, "package", approval), /dates are required/);
  assert.deepEqual(missing.counts(), { writes: 0, audits: 0 });
});
