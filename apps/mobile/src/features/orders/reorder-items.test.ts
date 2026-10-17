import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { URL } from "node:url";
import { reorderItems, type ReorderItem } from "./reorder-items";
import { createReorderRecovery } from "./reorder-recovery";

const item: ReorderItem = { id: "item", productId: "product", variantId: "black", quantity: 2, productName: "Headphones" };
test("failed catalog checks do not claim missing stock or prepare cart writes", async () => {
  const result = await reorderItems("failed-check", [item], {
    isCurrentAccount: () => true,
    loadProduct: async () => { throw new Error("Network unavailable"); },
    addVariant: async () => { assert.fail("Must not write"); },
    recovery: {
      load: async () => null,
      prepare: async () => { throw new Error("Must not prepare"); },
      complete: async () => { assert.fail("Must not complete"); }
    }
  });
  assert.equal(result[0]?.status, "check-failed");
});

test("reorder preserves the purchased variant and quantity without assuming availability", async () => {
  const writes: unknown[] = [];
  const result = await reorderItems("customer", [item, item], { isCurrentAccount: () => true, loadProduct: async () => ({ variants: [{ id: "red", active: true, availableQuantity: 99 }, { id: "black", active: true, availableQuantity: 3 }] }), addVariant: async (...args) => { writes.push(args); } });
  assert.deepEqual(writes, [["black", 2, undefined]]);
  assert.equal(result.length, 1);
  assert.equal(result[0]?.status, "added");
});
test("reorder does not replace unavailable variants or reduce requested quantities", async () => {
  for (const variant of [{ id: "red", active: true, availableQuantity: 99 }, { id: "black", active: false, availableQuantity: 99 }, { id: "black", active: true, availableQuantity: 1 }]) {
    const result = await reorderItems("customer", [item], { isCurrentAccount: () => true, loadProduct: async () => ({ variants: [variant] }), addVariant: async () => { assert.fail("Must not write"); } });
    assert.notEqual(result[0]?.status, "added");
  }
});
test("uncertain cart writes stop the batch without replay", async () => {
  let writes = 0;
  const result = await reorderItems("customer", [item, { ...item, id: "second" }], { isCurrentAccount: () => true, loadProduct: async () => ({ variants: [{ id: "black", active: true, availableQuantity: 9 }] }), addVariant: async () => { writes++; throw new Error("timeout"); } });
  assert.equal(writes, 1);
  assert.deepEqual(result.map((entry) => entry.status), ["unconfirmed", "not-attempted"]);
});
test("account change during product lookup prevents a cart write", async () => {
  let current = true;
  const result = await reorderItems("customer", [item], { isCurrentAccount: () => current, loadProduct: async () => { current = false; return { variants: [{ id: "black", active: true, availableQuantity: 9 }] }; }, addVariant: async () => { assert.fail("Must not write"); } });
  assert.equal(result[0]?.status, "not-attempted");
});

test("same-account reorder calls cannot overlap and the lock releases after completion", async () => {
  let release!: () => void;
  const waiting = new Promise<void>((resolve) => { release = resolve; });
  const dependencies = { isCurrentAccount: () => true, loadProduct: async () => { await waiting; return { variants: [{ id: "black", active: true, availableQuantity: 9 }] }; }, addVariant: async () => {} };
  const first = reorderItems("overlap", [item], dependencies);
  await assert.rejects(reorderItems("overlap", [item], dependencies), /Another reorder/);
  release();
  await first;
  assert.equal((await reorderItems("overlap", [item], dependencies))[0]?.status, "added");
});

test("order UI offers per-item and multi-item actions with account-scoped cart writes", () => {
  const expansion = readFileSync(new URL("./CustomerOrderExpansion.tsx", import.meta.url), "utf8");
  assert.match(expansion, /OrderReorder items=\{\[item\]\}/);
  assert.match(expansion, /pack.items.length, 0\) > 1/);
  const source = readFileSync(new URL("./OrderReorder.tsx", import.meta.url), "utf8");
  assert.match(source, /retry: false/);
  assert.match(source, /cache.setQueryData\(\["cart", user.uid\], cart\)/);
  assert.match(source, /mounted.current && Boolean\(ownerUid\) && activeUid.current === ownerUid/);
  assert.doesNotMatch(source, /firebaseAuth/);
  assert.match(source, /Retry product checks/);
  assert.match(expansion, /Delivery rescheduling/);
  assert.match(expansion, /accessibilityState=\{\{ disabled: true \}\} disabled/);
  assert.match(expansion, /Courier API pending/);
});

test("reload recovery replays original key before catalog checks and skips completed items", async () => {
  const data = new Map<string, string>();
  const variantId = "11111111-1111-4111-8111-111111111111";
  const key = "22222222-2222-4222-8222-222222222222";
  const store = createReorderRecovery({ getItem: async (key) => data.get(key) ?? null, setItem: async (key, value) => { data.set(key, value); } }, async (uid, itemId) => `${uid}:${itemId}`);
  const input = { ...item, variantId };
  let attempts = 0;
  let catalogReads = 0;
  const keys: Array<string | undefined> = [];
  const dependencies = {
    isCurrentAccount: () => true,
    loadProduct: async () => { catalogReads++; return { variants: [{ id: variantId, active: true, availableQuantity: 3 }] }; },
    addVariant: async (_id: string, _quantity: number, sentKey?: string) => { attempts++; keys.push(sentKey); if (attempts === 1) throw new Error("Lost response after server applied write"); },
    recovery: { load: () => store.load("recover", item.id), prepare: () => store.prepare("recover", item.id, { variantId, quantity: 2 }, key), complete: (_item: ReorderItem, savedKey: string) => store.complete("recover", item.id, savedKey) }
  };
  assert.equal((await reorderItems("recover", [input], dependencies))[0]?.status, "unconfirmed");
  assert.equal((await reorderItems("recover", [input], dependencies))[0]?.status, "added");
  assert.equal((await reorderItems("recover", [input], dependencies))[0]?.status, "previously-added");
  assert.equal(catalogReads, 1);
  assert.deepEqual(keys, [key, key]);
});
