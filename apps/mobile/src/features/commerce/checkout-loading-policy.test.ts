import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("checkout waits for a selected address before requesting a quote", () => {
  const source = readFileSync(new URL("./CheckoutScreen.tsx", import.meta.url), "utf8");

  assert.match(source, /quoteReady = Boolean\(user && !addresses\.isLoading && addressId\)/);
  assert.match(source, /enabled: quoteReady, retry: false/);
  assert.match(source, /Selected cart item is unavailable/);
  assert.match(source, /belongs to another signed-in cart/);
});
