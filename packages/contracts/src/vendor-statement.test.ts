import assert from "node:assert/strict";
import test from "node:test";
import { vendorStatementQuerySchema } from "./vendor-statement.js";
import { vendorFinanceSchema } from "./finance.js";

test("statement query rejects malformed month and vendor ID", () => {
  assert.equal(vendorStatementQuerySchema.safeParse({ month: "2026-09" }).success, true);
  for (const month of ["2026-00", "2026-13", "26-09", "2026-9", "2026-09-01"]) assert.equal(vendorStatementQuerySchema.safeParse({ month }).success, false);
  assert.equal(vendorStatementQuerySchema.safeParse({ month: "2026-09", vendorId: "other" }).success, false);
});

test("vendor balance supports an outstanding debit without allowing fractional minor units", () => {
  const value = { vendorId: "11111111-1111-4111-8111-111111111111", balance: { amountMinor: "-100", currency: "BDT" }, entries: [], payoutRequests: [] };
  assert.equal(vendorFinanceSchema.parse(value).balance.amountMinor, "-100");
  assert.equal(vendorFinanceSchema.safeParse({ ...value, balance: { ...value.balance, amountMinor: "-1.5" } }).success, false);
});
