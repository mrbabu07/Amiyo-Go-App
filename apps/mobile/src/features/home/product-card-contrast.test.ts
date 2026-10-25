import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const productCard = readFileSync(new URL("./components/ProductCard.tsx", import.meta.url), "utf8");

test("product card actions use the semantic foreground token", () => {
  assert.match(productCard, /color=\{colors\.onPrimary\} name="cart-outline"/);
  assert.match(productCard, /saved \? colors\.onPrimary : colors\.accent/);
  assert.match(productCard, /cartLabel: \{ color: colors\.onPrimary/);
  assert.doesNotMatch(productCard, /color="#fff" name="cart-outline"/);
});
