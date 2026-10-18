import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
const source = readFileSync(new URL("./VendorShopScreen.tsx", import.meta.url), "utf8"); const storefront = readFileSync(new URL("../catalog/ShopScreen.tsx", import.meta.url), "utf8");
test("seller profile hub stays identity scoped and links every shop workspace", () => { assert.match(source, /useCurrentUser\(\)/); assert.match(source, /queryKey: \["vendor", "workspace", user\?\.uid\]/); assert.match(source, /activeUid\.current/); for (const path of ["media", "decoration", "location", "categories"]) assert.match(source, new RegExp(`/vendor/shop/${path}`)); });
test("seller profile hub shows launch readiness and public preview", () => {
  assert.match(source, /STOREFRONT READINESS/);
  assert.match(source, /readinessChecks/);
  assert.match(source, /Shop profile/);
  assert.match(source, /Cover image/);
  assert.match(source, /Store tagline/);
  assert.match(source, /View public shop/);
  assert.match(source, /router\.push\(`\/shop\/\$\{shop\.slug\}`/);
  assert.match(source, /compact && styles\.readinessCompact/);
});
test("public shop renders the configured seller tagline", () => { assert.match(storefront, /storefront\?\.tagline/); });
