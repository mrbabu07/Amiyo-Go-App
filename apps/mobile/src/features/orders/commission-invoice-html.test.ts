import assert from "node:assert/strict";
import test from "node:test";
import type { VendorCommissionInvoice } from "@amiyo/contracts";
import { commissionInvoiceHtml } from "./commission-invoice-html";

test("settled invoice escapes content and explains signed adjustments without demanding duplicate payment", () => {
  const amount = { amountMinor: "-9007199254740993", currency: "BDT" };
  const html = commissionInvoiceHtml({ vendorName: "<script>Seller</script>", month: "2026-09", reference: "<img>", generatedAt: "2026-10-01", earned: amount, reversed: amount, net: amount, entries: [] } as unknown as VendorCommissionInvoice);
  assert.match(html, /&lt;script&gt;Seller/); assert.doesNotMatch(html, /<script>|<img>/);
  assert.match(html, /BDT -90071992547409\.93/);
  assert.match(html, /do not pay it again/);
  assert.match(html, /not a statutory VAT\/tax invoice/);
  assert.match(html, /No commission postings/);
});
