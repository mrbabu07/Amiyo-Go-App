import assert from "node:assert/strict";
import test from "node:test";
import { createWishlistCartRecovery, wishlistCartRecoveryMs } from "./wishlist-cart-recovery";

const first = "00000000-0000-4000-8000-000000000431";
const second = "00000000-0000-4000-8000-000000000432";
function fixture() {
  const data = new Map<string, string>();
  let time = 100;
  let sequence = 0;
  const storage = { getItem: async (key: string) => data.get(key) ?? null, setItem: async (key: string, value: string) => { data.set(key, value); } };
  const create = () => createWishlistCartRecovery(storage, async (uid, collection) => `${uid}:${collection}`, () => `00000000-0000-4000-8000-${String(++sequence).padStart(12, "0")}`, () => time);
  return { create, data, advance: (next: number) => { time = next; } };
}

test("reload reuses every product key and completed work cannot silently repeat", async () => {
  const value = fixture();
  const initial = await value.create().prepare("customer", "list", [first, second, first]);
  const restored = await value.create().prepare("customer", "list", [first, second]);
  assert.deepEqual(restored.keys, initial.keys);
  await value.create().complete("customer", "list", [first, second]);
  assert.equal((await value.create().prepare("customer", "list", [first, second])).completed, true);
  const restarted = await value.create().restartCompleted("customer", "list", [first, second]);
  assert.equal(restarted.completed, false);
  assert.notDeepEqual(restarted.keys, initial.keys);
});

test("changed, expired and corrupt pending work fails closed", async () => {
  const value = fixture();
  const store = value.create();
  await store.prepare("customer", "list", [first]);
  await assert.rejects(store.prepare("customer", "list", [second]), /saved list changed/);
  value.advance(100 + wishlistCartRecoveryMs);
  await assert.rejects(store.prepare("customer", "list", [first]), /recovery expired/);
  assert.ok(value.data.has("customer:list"));
  value.data.set("customer:list", "broken");
  await assert.rejects(store.load("customer", "list"), /unreadable/);
  assert.equal(await store.load("other", "list"), null);
});
