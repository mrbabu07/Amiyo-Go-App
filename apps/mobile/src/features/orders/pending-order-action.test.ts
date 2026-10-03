import assert from "node:assert/strict";
import test from "node:test";
import { createPendingOrderActionStore, mayDiscardOrderRejection, orderRecoveryWindowMs, type OrderCommand } from "./pending-order-action";

const firstKey = "00000000-0000-4000-8000-000000000001";
const nextKey = "00000000-0000-4000-8000-000000000002";
const command: OrderCommand = { kind: "cancel", input: { reason: "Changed mind", expectedVersion: 2 } };
function fixture() {
  const records = new Map<string, string>();
  const storage = { getItem: async (key: string) => records.get(key) ?? null, setItem: async (key: string, value: string) => { records.set(key, value); }, removeItem: async (key: string) => { records.delete(key); } };
  const key = async (uid: string, order: string) => JSON.stringify([uid, order]);
  let now = 1000;
  return { records, storage, key, setNow: (value: number) => { now = value; }, store: () => createPendingOrderActionStore(storage, key, () => now) };
}

test("reload and ambiguous retries preserve key, payload and original version", async () => {
  const setup = fixture();
  const original = await setup.store().prepare("customer", "order", command, firstKey);
  const retry = await setup.store().prepare("customer", "order", command, nextKey);
  assert.equal(original.fresh, true);
  assert.equal(retry.fresh, false);
  assert.equal(retry.key, firstKey);
  assert.deepEqual(retry.command, command);
  await assert.rejects(() => setup.store().prepare("customer", "order", { kind: "cancel", input: { reason: "Different reason", expectedVersion: 3 } }, nextKey), /original saved request/);
});

test("account and order boundaries isolate saved operations and cleanup keys", async () => {
  const setup = fixture();
  const store = setup.store();
  await store.prepare("first", "order", command, firstKey);
  assert.equal(await store.load("second", "order"), null);
  assert.equal(await store.load("first", "other-order"), null);
  await store.complete("first", "order", nextKey);
  assert.equal((await store.load("first", "order"))?.key, firstKey);
  await store.complete("first", "order", firstKey);
  assert.equal(await store.load("first", "order"), null);
});

test("expiry boundary and backwards clock block replay without deleting evidence", async () => {
  const setup = fixture();
  const store = setup.store();
  await store.prepare("customer", "order", command, firstKey);
  for (const now of [999, 1000 + orderRecoveryWindowMs]) {
    setup.setNow(now);
    await assert.rejects(() => store.prepare("customer", "order", command, nextKey), /expired/);
    assert.equal((await store.load("customer", "order"))?.key, firstKey);
  }
});

test("corrupt storage and write failures prevent new request preparation", async () => {
  const setup = fixture();
  setup.records.set(await setup.key("customer", "order"), "invalid");
  await assert.rejects(() => setup.store().prepare("customer", "order", command, firstKey), /unreadable/);
  const store = createPendingOrderActionStore({ ...setup.storage, setItem: async () => { throw new Error("Storage unavailable"); } }, setup.key);
  await assert.rejects(() => store.prepare("other", "order", command, firstKey), /Storage unavailable/);
});

test("partial return quantities and evidence survive reload; other operations cannot replace it", async () => {
  const setup = fixture();
  const request: OrderCommand = { kind: "return", input: { vendorOrderId: firstKey, reasonCode: "DAMAGED", refundMethod: "ORIGINAL_PAYMENT", items: [{ orderItemId: nextKey, quantity: 1 }], evidenceStorageKeys: ["private/return/image.jpg"] } };
  const first = await setup.store().prepare("customer", "order", request, firstKey);
  const retry = await setup.store().prepare("customer", "order", request, nextKey);
  assert.deepEqual(retry.command, first.command);
  await assert.rejects(() => setup.store().prepare("customer", "order", command, nextKey), /original saved request/);
});

test("only definite fresh pre-write rejections may clear saved requests", () => {
  assert.equal(mayDiscardOrderRejection(true, 409, "ORDER_VERSION_CONFLICT"), true);
  assert.equal(mayDiscardOrderRejection(false, 409, "ORDER_VERSION_CONFLICT"), false);
  assert.equal(mayDiscardOrderRejection(true, 500, "ORDER_VERSION_CONFLICT"), false);
  assert.equal(mayDiscardOrderRejection(true, 409, "RESOURCE_CONFLICT"), false);
});

test("concurrent preparation cannot replace an in-flight saved key in one runtime", async () => {
  const setup = fixture();
  const store = setup.store();
  const first = store.prepare("customer", "order", command, firstKey);
  await assert.rejects(() => store.prepare("customer", "order", command, nextKey), /being saved/);
  await first;
  assert.equal((await store.prepare("customer", "order", command, nextKey)).key, firstKey);
});
