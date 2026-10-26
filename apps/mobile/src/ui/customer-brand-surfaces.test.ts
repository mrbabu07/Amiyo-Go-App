import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

test("primary customer surfaces use semantic brand colors", () => {
  const source = [read("../features/home/CustomerHomeScreen.tsx"), read("../features/home/components/StoreFooter.tsx"), read("../features/home/components/ProductCard.tsx"), read("../features/engagement/WishlistToCart.tsx")].join("\n");
  assert.match(source, /colors\.onPrimary/);
  assert.match(source, /colors\.shellMuted/);
  assert.doesNotMatch(source, /#bae6fd|#94a3b8|#cbd5e1|#475569|#e2e8f0|"#fff"/i);
});
