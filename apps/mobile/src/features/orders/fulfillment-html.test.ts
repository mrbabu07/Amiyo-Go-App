import assert from "node:assert/strict";
import test from "node:test";
import type { FulfillmentDocument } from "@amiyo/contracts";
import { fulfillmentHtml } from "./fulfillment-html";

const money = { amountMinor: "12345", currency: "BDT" };
const fixture = { parcelId: "PARCEL-1", orderNumber: "ORDER-1", shopName: "Shop", trackingNumber: null, customer: { name: "<script>buyer</script>", phone: "01700000000", address: "Village" }, pickup: { name: "Seller", phone: "01800000000", address: "Market" }, payment: { method: "COD", collectAmount: { ...money, amountMinor: "0" } }, subtotal: money, total: money, discount: { ...money, amountMinor: "0" }, delivery: { ...money, amountMinor: "0" }, qrExpiresAt: "2026-12-16T00:00:00.000Z", items: [{ id: "item", name: "<b>Rice</b>", sku: "RICE", quantity: 2, unitPrice: money, lineTotal: money }] } as FulfillmentDocument;

test("parcel PDF uses thermal size, escaped address and actual collection balance", () => {
  const html = fulfillmentHtml(fixture, "cXJpbWFnZQ==", "parcel");
  assert.match(html, /100mm 150mm/);
  assert.match(html, /Collect: BDT 0\.00/);
  assert.match(html, /&lt;script&gt;buyer&lt;\/script&gt;/);
  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /data:image\/png;base64,cXJpbWFnZQ==/);
});

test("packing slip includes product quantities and exact totals on A4", () => {
  const html = fulfillmentHtml(fixture, "cXJpbWFnZQ==", "packing");
  assert.match(html, /size:A4/);
  assert.match(html, /&lt;b&gt;Rice&lt;\/b&gt;/);
  assert.match(html, /<td>2<\/td>/);
  assert.match(html, /Total: BDT 123\.45/);
});

test("documents refuse missing or injectable QR data", () => {
  assert.throws(() => fulfillmentHtml(fixture, "", "parcel"), /rendered QR/);
  assert.throws(() => fulfillmentHtml(fixture, '\" onerror=\"alert(1)', "parcel"), /rendered QR/);
});
