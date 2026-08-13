import assert from "node:assert/strict";
import test from "node:test";
import { SslCommerzGateway } from "./sslcommerz.gateway.js";

const env = { SSLCOMMERZ_STORE_ID: "sandbox-store", SSLCOMMERZ_STORE_PASSWORD: "sandbox-password", SSLCOMMERZ_SANDBOX: "true", API_PUBLIC_URL: "https://api.example.com" };
const input = { paymentId: "11111111-1111-4111-8111-111111111111", orderId: "22222222-2222-4222-8222-222222222222", orderNumber: "AGO-100", amountMinor: 10000n, currency: "BDT", customerName: "Test Customer", customerEmail: "customer@example.com", customerPhone: "01700000000", addressLine1: "Dhaka", city: "Dhaka", state: "Dhaka", itemCount: 1 };

test("SSLCommerz session uses server amount and merchant callbacks", async () => {
  let requestBody = "";
  const fetcher = async (_url: string | URL | Request, init?: RequestInit) => { requestBody = String(init?.body); return new Response(JSON.stringify({ status: "SUCCESS", sessionkey: "session-1", GatewayPageURL: "https://sandbox.sslcommerz.com/gwprocess/v4/gw.php?SESSIONKEY=session-1" }), { status: 200 }); };
  const gateway = new SslCommerzGateway(fetcher as typeof fetch, env);
  const result = await gateway.initiate(input);
  const form = new URLSearchParams(requestBody);
  assert.equal(form.get("total_amount"), "100.00");
  assert.equal(form.get("currency"), "BDT");
  assert.equal(form.get("value_a"), input.paymentId);
  assert.equal(form.get("success_url"), "https://api.example.com/api/v2/payments/sslcommerz/success");
  assert.equal(form.get("ipn_url"), "https://api.example.com/api/v2/payments/sslcommerz/ipn");
  assert.match(result.actionUrl, /^https:\/\/sandbox\.sslcommerz\.com\//);
});

test("SSLCommerz rejects an untrusted redirect URL", async () => {
  const fetcher = async () => new Response(JSON.stringify({ status: "SUCCESS", sessionkey: "session-1", GatewayPageURL: "https://evil.example/checkout" }), { status: 200 });
  await assert.rejects(() => new SslCommerzGateway(fetcher as typeof fetch, env).initiate(input), /invalid payment URL/);
});
