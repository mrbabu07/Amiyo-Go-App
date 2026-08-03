import assert from "node:assert/strict";
import test from "node:test";
import { accountDataExportSchema, invoiceSchema } from "./index.js";

test("account exports require all portable lifecycle collections", () => {
  const result = accountDataExportSchema.safeParse({
    generatedAt: new Date().toISOString(),
    profile: {},
    addresses: [],
    orders: [],
    returns: [],
    reviews: [],
    supportTickets: []
  });
  assert.equal(result.success, true);
  assert.equal(accountDataExportSchema.safeParse({ generatedAt: new Date().toISOString(), profile: {} }).success, false);
});

test("invoice contracts keep order ownership payload structured", () => {
  assert.equal(invoiceSchema.safeParse({ id: crypto.randomUUID(), number: "INV-1001", issuedAt: new Date().toISOString(), storageUrl: null }).success, false);
});
