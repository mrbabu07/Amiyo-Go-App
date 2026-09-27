import assert from "node:assert/strict";
import test from "node:test";
import type { Session } from "@amiyo/contracts";
import { VendorChargeReportService } from "./vendor-charge-report.service.js";

const vendorId = "11111111-1111-4111-8111-111111111111";
const session = { status: "ACTIVE", permissions: ["finance:read"], principal: { vendorIds: [vendorId] } } as Session;
const row = { id: vendorId, status: "DELIVERED", createdAt: new Date("2026-09-01T00:00:00Z"), subtotalMinor: 90071992547409930n, discountMinor: 0n, commissionMinor: 9007199254740993n, order: { orderNumber: "ORDER-1", currency: "BDT" } };

function fixture(rows = [row], exists = true) {
  const transaction = {
    vendor: { findUnique: async (query: { where: { id: string } }) => { assert.equal(query.where.id, vendorId); return exists ? { displayName: "Seller" } : null; } },
    vendorOrder: { findMany: async (query: { where: { vendorId: string; createdAt: { gte: Date; lt: Date } }; take: number }) => {
      assert.equal(query.where.vendorId, vendorId);
      assert.equal(query.where.createdAt.gte.toISOString(), "2026-08-31T18:00:00.000Z");
      assert.equal(query.where.createdAt.lt.toISOString(), "2026-09-30T18:00:00.000Z");
      assert.equal(query.take, 5001);
      return rows;
    } }
  };
  return new VendorChargeReportService({ $transaction: async (callback: (client: typeof transaction) => Promise<unknown>, options: { isolationLevel: string }) => { assert.equal(options.isolationLevel, "RepeatableRead"); return callback(transaction); } } as never);
}

test("charge report denies inactive users, missing finance permission and other sellers", async () => {
  const service = new VendorChargeReportService({} as never);
  await assert.rejects(service.report({ ...session, status: "SUSPENDED" } as Session, { month: "2026-09" }), /permission/);
  await assert.rejects(service.report({ ...session, permissions: [] }, { month: "2026-09" }), /permission/);
  await assert.rejects(service.report(session, { month: "2026-09", vendorId: "22222222-2222-4222-8222-222222222222" }), /workspace/);
  await assert.rejects(service.report(session, { month: "2026-13" }));
});

test("commission assessment keeps exact amounts and excludes cancelled/rejected packages", async () => {
  const report = await fixture([row, { ...row, status: "CANCELLED" }, { ...row, status: "REJECTED" }]).report(session, { month: "2026-09" });
  assert.equal(report.commissionMinor, "9007199254740993");
  assert.deepEqual(report.orders.map((order) => order.included), [true, false, false]);
  assert.equal(report.basis, "ORDER_CREATED_AT");
});

test("charge report exports beyond 100 rows but never truncates or combines currencies", async () => {
  assert.equal((await fixture(Array(101).fill(row)).report(session, { month: "2026-09" })).orders.length, 101);
  await assert.rejects(fixture(Array(5001).fill(row)).report(session, { month: "2026-09" }), /No partial report/);
  await assert.rejects(fixture([{ ...row, order: { ...row.order, currency: "USD" } }]).report(session, { month: "2026-09" }), /BDT only/);
});

test("charge report handles empty months and missing vendors without writing finance records", async () => {
  assert.equal((await fixture([]).report(session, { month: "2026-09" })).commissionMinor, "0");
  await assert.rejects(fixture([], false).report(session, { month: "2026-09" }), /Vendor not found/);
});
