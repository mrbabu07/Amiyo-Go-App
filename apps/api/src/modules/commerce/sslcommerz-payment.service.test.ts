import assert from "node:assert/strict";
import test from "node:test";
import type { PrismaClient } from "@prisma/client";
import { SslCommerzPaymentService } from "./sslcommerz-payment.service.js";
import type { SslCommerzGateway } from "./sslcommerz.gateway.js";

test("SSLCommerz notification rejects a validated amount mismatch", async () => {
  const gateway = { validate: async () => ({ status: "VALIDATED", tran_id: "AMY111", val_id: "validation-1", amount: "99.00", currency: "BDT", risk_level: "0" }) } as unknown as SslCommerzGateway;
  const client = { payment: { findUnique: async () => ({ id: "11111111-1111-4111-8111-111111111111", provider: "sslcommerz", providerTransactionId: "AMY111", amountMinor: 10000n, currency: "BDT", orderId: "22222222-2222-4222-8222-222222222222", order: { orderNumber: "AGO-100", invoice: null } }) } } as unknown as PrismaClient;
  const service = new SslCommerzPaymentService(client, gateway);
  await assert.rejects(() => service.receive({ status: "VALID", tran_id: "AMY111", val_id: "validation-1", value_a: "11111111-1111-4111-8111-111111111111", amount: "99.00", currency: "BDT" }), /amount does not match/);
});

test("SSLCommerz risk payments are held for verification", async () => {
  let held = false;
  const gateway = { validate: async () => ({ status: "VALIDATED", tran_id: "AMY111", val_id: "validation-1", amount: "100.00", currency: "BDT", risk_level: "1" }) } as unknown as SslCommerzGateway;
  const client = {
    payment: { findUnique: async () => ({ id: "11111111-1111-4111-8111-111111111111", provider: "sslcommerz", providerTransactionId: "AMY111", amountMinor: 10000n, currency: "BDT", orderId: "22222222-2222-4222-8222-222222222222", order: { orderNumber: "AGO-100", invoice: null } }) },
    paymentVerification: { upsert: async () => { held = true; } }
  } as unknown as PrismaClient;
  const result = await new SslCommerzPaymentService(client, gateway).receive({ status: "VALID", tran_id: "AMY111", val_id: "validation-1", value_a: "11111111-1111-4111-8111-111111111111", amount: "100.00", currency: "BDT" });
  assert.equal(result.held, true);
  assert.equal(held, true);
});
