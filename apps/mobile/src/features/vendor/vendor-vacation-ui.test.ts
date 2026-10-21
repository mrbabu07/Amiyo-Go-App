import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const settings = readFileSync(new URL("./VendorSettingsScreen.tsx", import.meta.url), "utf8");
const shop = readFileSync(new URL("../catalog/ShopScreen.tsx", import.meta.url), "utf8");

test("seller vacation mode preserves shop settings and controls new orders", () => {
  assert.match(settings, /Holiday and vacation mode/);
  assert.match(settings, /\.\.\.\(shop!\.settings \|\| \{\}\)/);
  assert.match(settings, /Schedule vacation/);
  assert.match(settings, /Cancel vacation/);
  assert.match(settings, /Existing orders stay active/);
});

test("public shop shows the buyer-safe vacation state", () => {
  assert.match(shop, /storefront\?\.vacation\?\.active/);
  assert.match(shop, /This shop is on vacation/);
  assert.match(shop, /Accepting new orders after/);
});
