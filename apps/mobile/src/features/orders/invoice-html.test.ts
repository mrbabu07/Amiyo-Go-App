import assert from "node:assert/strict";
import test from "node:test";
import { escapeInvoiceText, invoiceHtml } from "./invoice-html";

test("invoice text cannot inject markup into exported documents", () => {
  assert.equal(escapeInvoiceText('<script>"&'), "&lt;script&gt;&quot;&amp;");
});

test("PDF invoice preserves large minor-unit amounts and escapes customer data", () => {
  const total = { amountMinor: "9007199254740993", currency: "BDT" };
  const html = invoiceHtml({ orderNumber: "ORDER-1", status: "CONFIRMED", createdAt: "2026-09-16", customer: { displayName: "<img onerror=alert(1)>", email: null, phone: null }, subtotal: total, discount: { ...total, amountMinor: "0" }, delivery: { ...total, amountMinor: "0" }, total, vendorOrders: [] }, "INV-1", "2026-09-16", "aGVsbG8=");
  assert.match(html, /90071992547409\.93/);
  assert.match(html, /&lt;img onerror=alert\(1\)&gt;/);
  assert.doesNotMatch(html, /<img onerror/);
});

test("invoice export requires a rendered signed QR", () => {
  const money = { amountMinor: "0", currency: "BDT" };
  const order = { orderNumber: "ORDER-1", status: "CONFIRMED", createdAt: "2026-09-16", subtotal: money, discount: money, delivery: money, total: money, vendorOrders: [] };
  assert.throws(() => invoiceHtml(order, "INV-1", "2026-09-16"), /rendered QR/);
  assert.throws(() => invoiceHtml(order, "INV-1", "2026-09-16", '\" onerror=\"alert(1)'), /rendered QR/);
});

test("admin invoice exports commission and exact seller payable", () => {
  const money = { amountMinor: "10000", currency: "BDT" };
  const html = invoiceHtml({ orderNumber: "ORDER-2", status: "CONFIRMED", createdAt: "2026-09-16", subtotal: money, discount: { ...money, amountMinor: "0" }, delivery: { ...money, amountMinor: "0" }, total: money, vendorOrders: [{ id: "package", shopName: "Shop", status: "PLACED", subtotal: money, discount: { ...money, amountMinor: "0" }, delivery: { ...money, amountMinor: "0" }, total: money, commission: { ...money, amountMinor: "600" }, items: [] }] }, "INV-2", "2026-09-16", "aGVsbG8=", true);
  assert.match(html, /Commission: BDT 6\.00/);
  assert.match(html, /Seller payable: BDT 94\.00/);
});
