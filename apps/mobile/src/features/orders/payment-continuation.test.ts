import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { URL } from "node:url";
import { orderPaymentSchema } from "@amiyo/contracts";

test("order payment continuation remains optional and renders as an external secure link", () => {
  const base = { provider: "sslcommerz", method: "SSLCOMMERZ", status: "REQUIRES_ACTION", amount: { amountMinor: "10000", currency: "BDT" }, transactionId: null, createdAt: new Date().toISOString() };
  assert.equal(orderPaymentSchema.parse(base).actionUrl, undefined);
  assert.equal(orderPaymentSchema.parse({ ...base, actionUrl: "https://sandbox.sslcommerz.com/pay" }).actionUrl, "https://sandbox.sslcommerz.com/pay");
  const source = readFileSync(new URL("./OrderDeliverySummary.tsx", import.meta.url), "utf8");
  assert.match(source, /payment\.actionUrl/);
  assert.match(source, /target="_blank"/);
  assert.match(source, /Continue SSLCommerz payment/);
});
