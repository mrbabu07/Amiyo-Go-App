import assert from "node:assert/strict";
import test from "node:test";
import type { VendorStatement } from "@amiyo/contracts";
import { statementHtml } from "./statement-html";

test("seller statement escapes text, preserves signed big integers and labels its accounting scope", () => {
  const amount = { amountMinor: "-9007199254740993", currency: "BDT" };
  const html = statementHtml({ vendorName: "<script>Seller</script>", month: "2026-09", generatedAt: "2026-10-01", opening: amount, credits: { ...amount, amountMinor: "0" }, debits: amount, closing: amount, entries: [] } as unknown as VendorStatement);
  assert.match(html, /&lt;script&gt;Seller/);
  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /BDT -90071992547409\.93/);
  assert.match(html, /not a tax invoice/);
  assert.match(html, /No ledger entries/);
});
