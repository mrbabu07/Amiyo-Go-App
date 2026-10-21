import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./share-invoice.ts", import.meta.url), "utf8");
const customer = readFileSync(new URL("./InvoiceScreen.tsx", import.meta.url), "utf8");
const admin = readFileSync(new URL("../admin/AdminOrderInvoiceScreen.tsx", import.meta.url), "utf8");

test("customer and admin web invoices use isolated signed HTML export", () => {
  assert.doesNotMatch(source, /window\.print/);
  assert.match(source, /captureDocumentQr\(qr, webElementId\)/);
  assert.match(source, /invoiceHtml\(order, number, issuedAt, qrImage, admin\)/);
  assert.match(source, /shareDocumentPdf\(html, number\)/);
  assert.match(customer, /shareInvoice\([^;]+false, printId\)/);
  assert.match(admin, /shareInvoice\([^;]+true, printId\)/);
});
