import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("admin multi-store print center separates invoice and seller package exports", () => {
  const source = readFileSync(new URL("./AdminOrderPrintCenter.tsx", import.meta.url), "utf8");
  assert.match(source, /Full order invoice/);
  assert.match(source, /accessibilityRole="checkbox"/);
  assert.match(source, /batchDocumentLimit/);
  assert.match(source, /<BatchDocuments key=\{`\$\{user.uid\}/);
  assert.match(source, /ids=\{ids\}/);
  const detail = readFileSync(new URL("./AdminOrderDetailScreen.tsx", import.meta.url), "utf8");
  assert.match(detail, /<AdminOrderPrintCenter key=\{`\$\{user.uid\}:\$\{data.id\}`\}/);
});
