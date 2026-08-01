import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("cart and checkout expose accessible controls", async () => {
  const source = (await Promise.all([
    readFile(new URL("../apps/mobile/src/features/commerce/CartScreen.tsx", import.meta.url), "utf8"),
    readFile(new URL("../apps/mobile/src/features/commerce/CheckoutScreen.tsx", import.meta.url), "utf8")
  ])).join("\n");
  assert.match(source, /accessibilityRole="header"/);
  assert.match(source, /accessibilityRole="radio"/);
  assert.match(source, /accessibilityState=/);
  assert.match(source, /accessibilityLabel=/);
});
