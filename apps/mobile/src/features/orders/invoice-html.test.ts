import assert from "node:assert/strict";
import test from "node:test";
import { escapeInvoiceText, invoiceHtml } from "./invoice-html";

test("invoice text cannot inject markup into exported documents", () => {
  assert.equal(escapeInvoiceText('<script>"&'), "&lt;script&gt;&quot;&amp;");
});

test("PDF invoice preserves large minor-unit amounts and escapes customer data", () => {
  const total = { amountMinor: "9007199254740993", currency: "BDT" };
  const html = invoiceHtml({ orderNumber: "ORDER-1", status: "CONFIRMED", createdAt: "2026-09-16", customer: { displayName: "<img onerror=alert(1)>", email: null, phone: null }, subtotal: total, discount: { ...total, amountMinor: "0" }, delivery: { ...total, amountMinor: "0" }, total, vendorOrders: [] }, "INV-1", "2026-09-16");
  assert.match(html, /90071992547409\.93/);
  assert.match(html, /&lt;img onerror=alert\(1\)&gt;/);
  assert.doesNotMatch(html, /<img onerror/);
});
