import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
const editor = readFileSync(new URL("./VendorShopDecorationScreen.tsx", import.meta.url), "utf8"); const storefront = readFileSync(new URL("../catalog/ShopScreen.tsx", import.meta.url), "utf8");
test("seller decoration persists bounded storefront copy and renders it publicly", () => { assert.match(editor, /storefront: \{ tagline:/); assert.match(editor, /maxLength=\{120\}/); assert.match(editor, /maxLength=\{180\}/); assert.match(storefront, /storefront\?\.announcement/); assert.match(storefront, /storefront\?\.trustMessage/); });
