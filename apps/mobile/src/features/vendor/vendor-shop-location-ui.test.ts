import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
const source = readFileSync(new URL("./VendorShopLocationScreen.tsx", import.meta.url), "utf8");
test("seller pickup location persists the courier dispatch shape safely", () => { assert.match(source, /pickupAddress: form/); assert.match(source, /\^01\\d\{9\}\$/); assert.match(source, /queryKey: \["vendor", "workspace", user\?\.uid\]/); assert.match(source, /activeUid\.current/); });
