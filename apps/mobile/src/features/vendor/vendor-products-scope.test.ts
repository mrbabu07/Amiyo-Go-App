import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
const source = readFileSync(new URL("./VendorProductsScreen.tsx", import.meta.url), "utf8");
test("seller product list scopes reads and moderation submission by account", () => { assert.match(source, /useCurrentUser\(\)/); assert.match(source, /\["vendor", "products", user\?\.uid\]/); assert.match(source, /activeUid\.current === variables\.owner\.uid/); assert.match(source, /submit\.mutate\(\{ id: product\.id, owner: user! \}\)/); assert.doesNotMatch(source, /firebaseAuth\?\.currentUser/); });
