import assert from "node:assert/strict";
import test from "node:test";
import { vendorOrdersCsv } from "./vendor-orders-csv";

test("seller CSV preserves exact package money, Unicode and safe quoted cells", () => {
  const order = { id: "package", orderNumber: "order", shopName: '=HYPERLINK("evil")', createdAt: "2026-10-27", status: "PLACED", customer: { displayName: "ক্রেতা, নাম" }, total: { amountMinor: "900719925474099301", currency: "BDT" }, items: [{ productName: "Rice\nPremium", quantity: 2 }] };
  const csv = vendorOrdersCsv([order, order]);
  assert.ok(csv.startsWith("\uFEFF"));
  assert.match(csv, /"'=HYPERLINK\(""evil""\)"/);
  assert.match(csv, /"900719925474099301"/);
  assert.match(csv, /"ক্রেতা, নাম"/);
  assert.equal((csv.match(/"package"/g) ?? []).length, 1);
});
