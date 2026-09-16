import assert from "node:assert/strict";
import test from "node:test";
import type { FulfillmentDocument } from "@amiyo/contracts";
import { fulfillmentHtml } from "./fulfillment-html";
import { batchFulfillmentHtml, loadBatchDocuments } from "./batch-documents";

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

test("batch documents preserve order and deduplicate package requests", async () => {
  const calls: string[] = [];
  const documents = await loadBatchDocuments(["first", "second", "first"], async (id) => { calls.push(id); return { ...fixture, parcelId: id }; });
  assert.deepEqual(calls, ["first", "second"]);
  assert.deepEqual(documents.map((document) => document.parcelId), calls);
  const html = batchFulfillmentHtml(documents, ["Zmlyc3Q=", "c2Vjb25k"], "parcel");
  assert.equal((html.match(/class="package"/g) ?? []).length, 2);
  assert.equal((html.match(/<!doctype html>/g) ?? []).length, 1);
  assert.match(html, /break-before:page/);
  assert.ok(html.indexOf("Zmlyc3Q=") < html.indexOf("c2Vjb25k"));
});

test("batch rejects oversized, empty and partially authorized requests", async () => {
  let calls = 0;
  const load = async () => { calls++; return fixture; };
  await assert.rejects(loadBatchDocuments([], load), /Select 1 to 20/);
  await assert.rejects(loadBatchDocuments(Array.from({ length: 21 }, (_, index) => String(index)), load), /Select 1 to 20/);
  assert.equal(calls, 0);
  await assert.rejects(loadBatchDocuments(["owned", "denied", "later"], async (id) => { if (id === "denied") throw new Error("Forbidden"); calls++; return fixture; }), /Forbidden/);
  assert.equal(calls, 1);
  assert.throws(() => batchFulfillmentHtml([fixture], [], "parcel"), /Invalid document batch/);
  assert.throws(() => batchFulfillmentHtml([], [], "packing"), /Invalid document batch/);
});
