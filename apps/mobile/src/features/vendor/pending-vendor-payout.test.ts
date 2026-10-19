import assert from "node:assert/strict";
import test from "node:test";
import { createPendingVendorPayoutStore, mayDiscardRejectedPayout, payoutRecoveryWindowMs } from "../operations/pending-vendor-payout";

const input = { bankAccountId: "11111111-1111-4111-8111-111111111111", amountMinor: "50000" };
const key = "22222222-2222-4222-8222-222222222222";

function setup(now = 1_000) {
  const values = new Map<string, string>();
  const storage = { getItem: async (name: string) => values.get(name) ?? null, setItem: async (name: string, value: string) => { values.set(name, value); }, removeItem: async (name: string) => { values.delete(name); } };
  return { values, store: createPendingVendorPayoutStore(storage, async (uid) => uid, () => now) };
}

test("reload reuses the original payout key and payload", async () => {
  const state = setup();
  assert.equal((await state.store.prepare("vendor", input, key)).fresh, true);
  const recovered = await state.store.prepare("vendor", input, "33333333-3333-4333-8333-333333333333");
  assert.equal(recovered.fresh, false);
  assert.equal(recovered.key, key);
  await assert.rejects(state.store.prepare("vendor", { ...input, amountMinor: "60000" }, key), /earlier payout/);
});

test("only matching confirmation clears payout recovery", async () => {
  const state = setup();
  await state.store.prepare("vendor", input, key);
  await state.store.complete("vendor", "33333333-3333-4333-8333-333333333333");
  assert.ok(await state.store.load("vendor"));
  await state.store.complete("vendor", key);
  assert.equal(await state.store.load("vendor"), null);
});

test("expired, backwards-clock, corrupt and unavailable recovery fail closed", async () => {
  const initial = setup();
  await initial.store.prepare("vendor", input, key);
  const raw = initial.values.get("vendor")!;
  const storage = { getItem: async () => raw, setItem: async () => {}, removeItem: async () => {} };
  await assert.rejects(createPendingVendorPayoutStore(storage, async () => "vendor", () => 999).prepare("vendor", input, key), /expired/);
  await assert.rejects(createPendingVendorPayoutStore(storage, async () => "vendor", () => 1_000 + payoutRecoveryWindowMs).prepare("vendor", input, key), /expired/);
  await assert.rejects(createPendingVendorPayoutStore({ ...storage, getItem: async () => "broken" }, async () => "vendor").load("vendor"), /could not be read/);
  await assert.rejects(createPendingVendorPayoutStore({ ...storage, getItem: async () => null, setItem: async () => { throw new Error("storage unavailable"); } }, async () => "vendor").prepare("vendor", input, key), /storage unavailable/);
});

test("only definite fresh business rejections may discard recovery", () => {
  assert.equal(mayDiscardRejectedPayout(true, 409, "PAYOUT_BALANCE_INSUFFICIENT"), true);
  assert.equal(mayDiscardRejectedPayout(false, 409, "PAYOUT_BALANCE_INSUFFICIENT"), false);
  assert.equal(mayDiscardRejectedPayout(true, 500, "PAYOUT_BALANCE_INSUFFICIENT"), false);
  assert.equal(mayDiscardRejectedPayout(true, 409, "UNKNOWN"), false);
});
