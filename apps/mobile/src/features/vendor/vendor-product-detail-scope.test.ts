import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
const source = readFileSync(new URL("./VendorProductDetailScreen.tsx", import.meta.url), "utf8");
test("seller product detail scopes reads and completed writes to the active account", () => { assert.match(source, /useCurrentUser\(\)/); assert.match(source, /queryKey: \["vendor", "products", user\?\.uid\]/); assert.match(source, /activeUid\.current === owner\.uid/); assert.match(source, /activeUid\.current === variables\.owner\.uid/); assert.doesNotMatch(source, /firebaseAuth\?\.currentUser/); });
