import assert from "node:assert/strict";
import test from "node:test";
import { createVendorBatchRecovery, vendorBatchRecoveryWindowMs } from "./vendor-batch-recovery";

const first = "00000000-0000-4000-8000-000000000001";
const second = "00000000-0000-4000-8000-000000000002";
function setup() {
  const data = new Map<string, string>(); let time = 1_000;
  const storage = { getItem: async (key: string) => data.get(key) ?? null, setItem: async (key: string, value: string) => { data.set(key, value); }, removeItem: async (key: string) => { data.delete(key); } };
  return { setTime: (next: number) => { time = next; }, store: () => createVendorBatchRecovery(storage, () => time) };
}
test("seller batch plan and completed packages survive reload per account", async () => {
  const state = setup(); await state.store().start("seller-a", "ACCEPTED", [first, second]); await state.store().complete("seller-a", first);
  const reloaded = await state.store().load("seller-a");
  assert.deepEqual(reloaded && { action: reloaded.action, ids: reloaded.ids, completedIds: reloaded.completedIds }, { action: "ACCEPTED", ids: [first, second], completedIds: [first] });
  assert.equal(await state.store().load("seller-b"), null); await state.store().clear("seller-a"); assert.equal(await state.store().load("seller-a"), null);
});
test("seller batch recovery rejects replacement, invalid progress and expired plans", async () => {
  const state = setup(); const store = state.store(); await store.start("seller", "PROCESSING", [first]);
  await assert.rejects(store.start("seller", "READY_TO_SHIP", [second]), /Finish or discard/); await assert.rejects(store.complete("seller", second), /does not belong/);
  state.setTime(1_000 + vendorBatchRecoveryWindowMs); await assert.rejects(state.store().load("seller"), /expired/);
});
test("seller batch plan fails closed when durable storage is unavailable", async () => {
  const store = createVendorBatchRecovery({ getItem: async () => null, setItem: async () => { throw new Error("Storage unavailable"); }, removeItem: async () => {} });
  await assert.rejects(store.start("seller", "ACCEPTED", [first]), /Storage unavailable/); assert.equal(await store.load("seller"), null);
});
