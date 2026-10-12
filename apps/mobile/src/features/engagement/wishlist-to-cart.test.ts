import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { URL } from "node:url";
import { wishlistToCart, type WishlistCartProduct } from "./wishlist-to-cart";

const product = (id: string): WishlistCartProduct => ({ productId: id, slug: id, name: id });
const available = { variants: [{ id: "variant", active: true, availableQuantity: 1 }] };

test("bulk UI disables replay, updates scoped carts and offers explicit option selection", () => {
  const source = readFileSync(new URL("./WishlistToCart.tsx", import.meta.url), "utf8");
  assert.match(source, /retry: false/);
  assert.match(source, /addCartItem\(user, variantId, 1, saved\.keys\[productId\]\)/);
  assert.match(source, /wishlistCartRecovery\.prepare\(uid, collectionId, productIds\)/);
  assert.match(source, /wishlistCartRecovery\.complete\(uid, collectionId, productIds\)/);
  assert.match(source, /Resume safely/);
  assert.match(source, /Start another copy/);
  assert.match(source, /firebaseAuth\?\.currentUser\?\.uid === result.uid/);
  assert.match(source, /invalidateQueries\(\{ queryKey: \["cart", result.uid\] \}\)/);
  assert.match(source, /disabled=\{!products.length \|\| busy \|\| mutation.isPending \|\| receipt === undefined \|\| Boolean\(recoveryError\)/);
  assert.match(source, /Boolean\(receipt\?\.completed\)/);
  assert.match(source, /Choose options for/);
  assert.match(source, /last item may already be there/);
});

test("bulk wishlist copies one of each unique single-option product and does not guess variants", async () => {
  const added: string[] = [];
  const products = [product("single"), product("options"), product("sold-out"), product("inactive"), product("single")];
  const result = await wishlistToCart("customer", products, {
    isCurrentAccount: () => true,
    loadProduct: async (id) => {
      if (id === "options") return { variants: [...available.variants, { id: "other", active: true, availableQuantity: 0 }] };
      if (id === "sold-out") return { variants: [{ id, active: true, availableQuantity: 0 }] };
      if (id === "inactive") return { variants: [{ id, active: false, availableQuantity: 10 }] };
      return available;
    },
    addVariant: async (id) => { added.push(id); }
  });
  assert.deepEqual(added, ["variant"]);
  assert.deepEqual(result.items.map((item) => item.status), ["added", "choose-options", "out-of-stock", "out-of-stock"]);
  assert.equal(products.length, 5);
});

test("catalog read failures are explicit and do not prevent unrelated safe additions", async () => {
  let additions = 0;
  const result = await wishlistToCart("customer", [product("missing"), product("available")], {
    isCurrentAccount: () => true,
    loadProduct: async (id) => { if (id === "missing") throw new Error("Unavailable"); return available; },
    addVariant: async () => { additions += 1; }
  });
  assert.equal(additions, 1);
  assert.deepEqual(result.items.map((item) => item.status), ["unavailable", "added"]);
});

test("an unconfirmed cart write stops remaining writes without automatic retry", async () => {
  let additions = 0;
  let reads = 0;
  const result = await wishlistToCart("customer", [product("first"), product("second"), product("third")], {
    isCurrentAccount: () => true,
    loadProduct: async () => { reads += 1; return available; },
    addVariant: async () => { additions += 1; if (additions === 2) throw new Error("Response lost after commit"); }
  });
  assert.equal(additions, 2);
  assert.equal(reads, 2);
  assert.deepEqual(result.items.map((item) => item.status), ["added", "unconfirmed", "not-attempted"]);
});

test("account changes during catalog fetch prevent all subsequent cart writes", async () => {
  let current = true;
  const result = await wishlistToCart("customer", [product("first"), product("second")], {
    isCurrentAccount: () => current,
    loadProduct: async () => { current = false; return available; },
    addVariant: async () => { assert.fail("Must not write after account change"); }
  });
  assert.equal(result.accountChanged, true);
  assert.deepEqual(result.items.map((item) => item.status), ["not-attempted", "not-attempted"]);
});

test("overlapping bulk operations for the same account are rejected across collections", async () => {
  let release!: () => void;
  const pending = new Promise<void>((resolve) => { release = resolve; });
  const dependencies = {
    isCurrentAccount: () => true,
    loadProduct: async () => { await pending; return available; },
    addVariant: async () => {}
  };
  const first = wishlistToCart("locked-customer", [product("first")], dependencies);
  try {
    await assert.rejects(wishlistToCart("locked-customer", [product("second")], dependencies), /already running/);
  } finally { release(); }
  assert.equal((await first).items[0]?.status, "added");
  assert.equal((await wishlistToCart("locked-customer", [], dependencies)).items.length, 0);
});
