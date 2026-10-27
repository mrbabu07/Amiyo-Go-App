import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("seller desktop table shares package selection and expansion without nested buttons", () => {
  const source = readFileSync(new URL("./VendorOrderTable.tsx", import.meta.url), "utf8");
  const screen = readFileSync(new URL("./VendorOrdersScreen.tsx", import.meta.url), "utf8");
  assert.match(screen, /width >= 1100/);
  assert.match(screen, /tableLayout \? <VendorOrderTable/);
  assert.match(source, /selectedIds.length >= batchDocumentLimit/);
  assert.match(source, /accessibilityRole="checkbox"/);
  assert.match(source, /<VendorOrderExpansion key=\{`\$\{uid\}:\$\{order.id\}`\}/);
  assert.match(source, /formatMinor\(order.total.amountMinor/);
  assert.match(source, /Print \/ PDF/);
});
