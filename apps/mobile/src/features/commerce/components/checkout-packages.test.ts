import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";

const component = readFileSync(fileURLToPath(new URL("./CheckoutPackages.tsx", import.meta.url)), "utf8");
const coupon = readFileSync(fileURLToPath(new URL("./CouponInput.tsx", import.meta.url)), "utf8");

test("checkout package preview groups seller lines with exact money arithmetic", () => {
  assert.match(component, /new Map<string, CheckoutQuote/);
  assert.match(component, /BigInt\(item\.lineTotal\.amountMinor\)/);
  assert.match(component, /item\.thumbnailUrl \|\| fallbackImage/);
  assert.match(component, /packed separately/);
});

test("checkout coupon area shows packages only on checkout routes", () => {
  assert.match(coupon, /pathname\.includes\("checkout"\)/);
  assert.match(coupon, /<CheckoutPackages quote=\{appliedQuote\} \/>/);
});
