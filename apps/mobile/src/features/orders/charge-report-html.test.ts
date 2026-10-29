import assert from "node:assert/strict";
import test from "node:test";
import type { VendorChargeReport } from "@amiyo/contracts";
import { chargeReportHtml } from "./charge-report-html";

test("commission export escapes dynamic text and distinguishes assessment from settled charges", () => {
  const report = { vendorName: "<script>Seller</script>", month: "2026-09", generatedAt: "2026-10-01", commissionMinor: "9007199254740993", orders: [{ orderNumber: "<img src=x>", status: "CANCELLED", createdAt: "2026-09-01T00:00:00Z", subtotalMinor: "100", discountMinor: "0", commissionMinor: "6", included: false }] } as unknown as VendorChargeReport;
  const html = chargeReportHtml(report);
  assert.match(html, /&lt;script&gt;Seller/);
  assert.match(html, /&lt;img src=x&gt;/);
  assert.equal(html.includes("<script>"), false);
  assert.equal(html.includes("<img src=x>"), false);
  assert.match(html, /BDT 90071992547409\.93/);
  assert.match(html, /CANCELLED \(excluded\)/);
  assert.match(html, /not a tax invoice/);
  assert.match(html, /commission reversals and VAT are not calculated/);
  assert.match(chargeReportHtml({ ...report, orders: [] }), /No orders in this period/);
});
