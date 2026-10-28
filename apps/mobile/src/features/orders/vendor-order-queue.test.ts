import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("seller queue exposes missing lifecycle filters and scoped print selection", () => {
  const source = readFileSync(new URL("./VendorOrdersScreen.tsx", import.meta.url), "utf8");
  const filters = source.match(/const filters = (.*);/)?.[1] ?? "";
  for (const status of ["ACCEPTED", "PICKED_UP", "REJECTED"]) assert.ok(filters.includes(status));
  assert.match(source, /getVendorOrders\(user!, pageParam, linkedOrderId, \{ search: debouncedSearch, status: filter, shop: shopFilter, payment: paymentFilter \}\)/);
  assert.match(source, /visible.slice\(0, batchDocumentLimit\)/);
  assert.match(source, /Search, status, store and payment filters run before pagination/);
  assert.match(source, /setSelected\(\[\]\).*\[user\?\.uid\]/);
  assert.match(source, /VendorOrderExport key=\{`export:\$\{user\.uid\}`\}/);
  assert.match(source, /VendorBulkActions key=\{`bulk:\$\{user\.uid\}`\}/);
});

test("seller detail exposes independent package print tools with account and version boundaries", () => {
  const source = readFileSync(new URL("./VendorOrderDetailScreen.tsx", import.meta.url), "utf8");
  assert.match(source, /title="Print & packing tools"/);
  assert.match(source, /key=\{`\$\{user.uid\}:\$\{item.id\}:\$\{item.version\}`\}/);
  assert.match(source, /ids=\{\[item.id\]\}/);
});
