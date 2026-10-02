import assert from "node:assert/strict";
import test from "node:test";
import { createPendingCheckoutStore, mayDiscardRejectedCheckout, recoveryWindowMs } from "./pending-checkout";

const key = "11111111-1111-4111-8111-111111111111";
const otherKey = "22222222-2222-4222-8222-222222222222";
const input = { addressId: key, paymentMethod: "COD" as const };
function fixture() {
  const values = new Map<string, string>();
  const storage = { getItem: async (name: string) => values.get(name) ?? null, setItem: async (name: string, value: string) => { values.set(name, value); }, removeItem: async (name: string) => { values.delete(name); } };
  return { values, storage, create: (now = 1000) => createPendingCheckoutStore(storage, async (uid) => uid, () => now) };
}

test("restart reuses original checkout key and payload, not a new UUID", async () => {
  const state = fixture();
  assert.equal((await state.create().prepare("alice", input, key)).fresh, true);
  const recovered = await state.create().prepare("alice", input, otherKey);
  assert.equal(recovered.key, key);
  assert.equal(recovered.fresh, false);
  assert.deepEqual(recovered.input, input);
  assert.equal(await state.create().load("bob"), null);
});

test("uncertain order prevents replacing its input and expires without automatic resubmission", async () => {
  const state = fixture();
  await state.create().prepare("alice", input, key);
  await assert.rejects(state.create().prepare("alice", { ...input, addressId: otherKey }, otherKey), /earlier checkout/);
  await assert.rejects(state.create(1000 + recoveryWindowMs).prepare("alice", input, otherKey), /expired/);
  assert.equal((await state.create().load("alice"))?.key, key);
});

test("only matching successful attempt clears its recovery record", async () => {
  const state = fixture();
  await state.create().prepare("alice", input, key);
  await state.create().complete("alice", otherKey);
  assert.ok(await state.create().load("alice"));
  await state.create().complete("alice", key);
  assert.equal(await state.create().load("alice"), null);
});

test("corrupt records and storage failures fail closed", async () => {
  const state = fixture();
  state.values.set("alice", "invalid");
  await assert.rejects(state.create().prepare("alice", input, key), /could not be read/);
  state.storage.setItem = async () => { throw new Error("disk full"); };
  await assert.rejects(state.create().prepare("bob", input, key), /disk full/);
});

test("only definite first-attempt business rejections can discard recovery", () => {
  assert.equal(mayDiscardRejectedCheckout(true, 400, "COD_PHONE_CONFIRMATION_REQUIRED"), true);
  assert.equal(mayDiscardRejectedCheckout(true, 409, "INSUFFICIENT_STOCK"), true);
  assert.equal(mayDiscardRejectedCheckout(false, 409, "INSUFFICIENT_STOCK"), false);
  assert.equal(mayDiscardRejectedCheckout(true, 500, "INSUFFICIENT_STOCK"), false);
  assert.equal(mayDiscardRejectedCheckout(true, 409, "IDEMPOTENCY_KEY_REUSED"), false);
});
