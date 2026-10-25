import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const productSource = readFileSync(new URL("./components/ProductCard.tsx", import.meta.url), "utf8");
const categorySource = readFileSync(new URL("./components/CategoryRail.tsx", import.meta.url), "utf8");
const shopSource = readFileSync(new URL("./components/ShopRail.tsx", import.meta.url), "utf8");

test("marketplace cards use premium shadows without white outline borders", () => {
  assert.match(productSource, /boxShadow: "0 12px 30px rgba\(11,31,58,0\.10\)"/);
  assert.doesNotMatch(productSource, /borderColor: "#fff"/);
  assert.doesNotMatch(productSource, /borderTopColor: "#f1f5f9"/);
  assert.doesNotMatch(categorySource, /borderColor: "#edf1f5"/);
  assert.doesNotMatch(shopSource, /borderWidth: 1/);
});

test("shop cards expose link semantics and pressed feedback", () => {
  assert.match(shopSource, /accessibilityRole="link"/);
  assert.match(shopSource, /pressed && styles\.pressed/);
  assert.match(shopSource, /const shadow = Platform\.select/);
});

test("village data saver avoids marketplace image requests", () => {
  assert.match(productSource, /dataSaver \? <View/);
  assert.match(productSource, /const dataSaver = lowData \|\| policyLowData/);
  assert.match(productSource, /image hidden to save data/);
  assert.match(productSource, /DATA SAVER/);
  assert.match(shopSource, /shop\.logoUrl && !lowData/);
});
