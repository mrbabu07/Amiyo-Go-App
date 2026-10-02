import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { URL } from "node:url";
import test from "node:test";
import { QueryClient } from "@tanstack/react-query";

test("late cart and wishlist responses remain isolated after account cache clearing", async () => {
  for (const scope of ["cart", "wishlist"]) {
    const cache = new QueryClient();
    let finish: (data: string[]) => void = () => {};
    const response = new Promise<string[]>((resolve) => { finish = resolve; });
    const pending = response.then((data) => cache.setQueryData([scope, "previous-user"], data));
    cache.clear();
    cache.setQueryData([scope, "current-user"], ["current-item"]);
    finish(["previous-item"]);
    await pending;
    assert.deepEqual(cache.getQueryData([scope, "current-user"]), ["current-item"]);
    assert.equal(cache.getQueryData([scope, null]), undefined);
    cache.clear();
  }
});

test("cart and wishlist consumers subscribe to identity and never write unscoped caches", async () => {
  for (const path of ["../catalog/ProductDetailScreen.tsx", "../commerce/CartScreen.tsx", "../engagement/WishlistScreen.tsx", "../home/components/ProductCard.tsx", "../home/components/StoreHeader.tsx"]) {
    const source = await readFile(new URL(path, import.meta.url), "utf8");
    assert.ok(source.includes("const user = useCurrentUser()"), path);
    assert.doesNotMatch(source, /(?:queryKey:\s*|setQueryData\()\["(?:cart|wishlist)"\]/, path);
  }
});
