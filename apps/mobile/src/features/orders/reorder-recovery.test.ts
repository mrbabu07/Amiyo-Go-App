import assert from "node:assert/strict";
import test from "node:test";
import { createReorderRecovery, reorderRecoveryMs } from "./reorder-recovery";

const key = "11111111-1111-4111-8111-111111111111";
const otherKey = "22222222-2222-4222-8222-222222222222";
const payload = { variantId: key, quantity: 2 };
function fixture() {
  const data = new Map<string, string>();
  let time = 100;
  const storage = { getItem: async (key: string) => data.get(key) ?? null, setItem: async (key: string, value: string) => { data.set(key, value); } };
  const create = () => createReorderRecovery(storage, async (uid, item) => `${uid}:${item}`, () => time);
  return { data, create, advance: (value: number) => { time = value; } };
}
test("reload preserves original payload/key and completed receipts prevent a fresh replay", async () => {
  const value = fixture();
  await value.create().prepare("customer", "item", payload, key);
  const restored = value.create();
  assert.equal((await restored.prepare("customer", "item", payload, otherKey)).key, key);
  await restored.complete("customer", "item", key);
  value.advance(reorderRecoveryMs * 2);
  assert.equal((await value.create().prepare("customer", "item", payload, otherKey)).completed, true);
  await assert.rejects(restored.prepare("customer", "item", { ...payload, quantity: 3 }, otherKey), /original reorder/);
});
test("uncertain receipt expiry, backwards time and corruption fail closed without deleting evidence", async () => {
  const value = fixture();
  const store = value.create();
  await store.prepare("customer", "item", payload, key);
  value.advance(99);
  await assert.rejects(store.prepare("customer", "item", payload, otherKey), /expired/);
  value.advance(100 + reorderRecoveryMs);
  await assert.rejects(store.prepare("customer", "item", payload, otherKey), /expired/);
  assert.ok(value.data.has("customer:item"));
  assert.equal(await store.load("other", "item"), null);
  await assert.rejects(store.complete("customer", "item", otherKey), /changed/);
  value.data.set("customer:item", "broken");
  await assert.rejects(store.load("customer", "item"), /unreadable/);
});

test("deliberate repeat requires the matching completed receipt and cannot reset uncertain work", async () => {
  const value = fixture();
  const store = value.create();
  await store.prepare("customer", "item", payload, key);
  await assert.rejects(store.restartCompleted("customer", "item", key, otherKey), /confirmed previous/);
  await store.complete("customer", "item", key);
  await assert.rejects(store.restartCompleted("customer", "item", otherKey, key), /confirmed previous/);
  await assert.rejects(store.restartCompleted("customer", "item", key, key), /confirmed previous/);
  const next = await store.restartCompleted("customer", "item", key, otherKey);
  assert.equal(next.completed, false);
  assert.equal(next.key, otherKey);
  assert.deepEqual(next.payload, payload);
  await assert.rejects(store.restartCompleted("customer", "item", key, otherKey), /confirmed previous/);
});
