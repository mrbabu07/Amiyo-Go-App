import assert from "node:assert/strict";
import test from "node:test";
import { createVendorTransitionRecovery } from "./vendor-transition-recovery";

test("seller transition reload replays original payload and key after lost response", async () => {
  const values = new Map<string, string>();
  const storage = { getItem: async (key: string) => values.get(key) ?? null, setItem: async (key: string, value: string) => { values.set(key, value); }, removeItem: async (key: string) => { values.delete(key); } };
  const input = { status: "REJECTED" as const, expectedVersion: 2, reason: "Stock unavailable" };
  const key = "00000000-0000-4000-8000-000000000001";
  await assert.rejects(createVendorTransitionRecovery(storage).run("seller", "package", input, key, async () => { throw new Error("Lost response"); }), /Lost response/);
  const reloaded = createVendorTransitionRecovery(storage);
  assert.equal(await reloaded.load("other", "package"), null);
  await assert.rejects(reloaded.run("seller", "package", { ...input, status: "ACCEPTED" }, key, async () => null), /Recover REJECTED/);
  await reloaded.run("seller", "package", { ...input, expectedVersion: 3, reason: "Changed draft" }, "00000000-0000-4000-8000-000000000002", async (actual, actualKey) => { assert.deepEqual(actual, input); assert.equal(actualKey, key); });
  assert.equal(await reloaded.load("seller", "package"), null);
});
