import assert from "node:assert/strict";
import test from "node:test";
import type { PrismaClient } from "@prisma/client";
import type { SslCommerzGateway } from "../commerce/sslcommerz.gateway.js";
import { initiateRefundOnce } from "./provider-refund-initiation.js";

const input = { orderId: "order", expectedVersion: 1, bankTransactionId: "bank", amountMinor: 100n, reason: "Customer approved refund" };
function fixture(fail = false) {
  const records = new Map<string, { requestHash: string; response: unknown }>();
  let calls = 0;
  const transaction = {
    idempotencyRecord: {
      findUnique: async ({ where }: { where: { scope_key: { key: string } } }) => records.get(where.scope_key.key) ?? null,
      findMany: async () => [...records.values()],
      create: async ({ data }: { data: { key: string; requestHash: string; response: unknown; expiresAt: Date | null } }) => { assert.equal(data.expiresAt, null); records.set(data.key, data); return data; },
      update: async ({ where, data }: { where: { scope_key: { key: string } }; data: { response: unknown } }) => { Object.assign(records.get(where.scope_key.key)!, data); return data; }
    },
    refund: { findUnique: async () => null }
  };
  const client = { ...transaction, $transaction: async (operation: (database: typeof transaction) => Promise<unknown>) => operation(transaction) } as unknown as PrismaClient;
  const gateway = { initiateRefund: async () => { calls++; if (fail) throw new Error("timeout"); return { refundRefId: "ref", status: "success" }; } } as unknown as SslCommerzGateway;
  return { client, gateway, calls: () => calls };
}

test("provider refund retries reuse the persisted reference without another money request", async () => {
  const state = fixture();
  assert.equal((await initiateRefundOnce(state.client, state.gateway, input)).refundRefId, "ref");
  assert.equal((await initiateRefundOnce(state.client, state.gateway, input)).refundRefId, "ref");
  assert.equal(state.calls(), 1);
  await assert.rejects(initiateRefundOnce(state.client, state.gateway, { ...input, amountMinor: 200n }), /owns this order version/);
  await assert.rejects(initiateRefundOnce(state.client, state.gateway, { ...input, expectedVersion: 2 }), /previous provider refund/);
  assert.equal(state.calls(), 1);
});

test("ambiguous timeout remains reserved and cannot trigger an automatic duplicate refund", async () => {
  const state = fixture(true);
  await assert.rejects(initiateRefundOnce(state.client, state.gateway, input), /timeout/);
  await assert.rejects(initiateRefundOnce(state.client, state.gateway, input), /outcome is unknown/);
  assert.equal(state.calls(), 1);
});
