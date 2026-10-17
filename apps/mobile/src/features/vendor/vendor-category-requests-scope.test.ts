import assert from "node:assert/strict"; import { readFileSync } from "node:fs"; import test from "node:test";
const source = readFileSync(new URL("./VendorCategoryRequestsScreen.tsx", import.meta.url), "utf8");
test("seller category requests are identity scoped and reset drafts on account change", () => { assert.match(source, /useCurrentUser\(\)/); assert.match(source, /\["vendor", "category-requests", user\?\.uid\]/); assert.match(source, /activeUid\.current !== owner\.uid/); assert.match(source, /\[user\?\.uid\]/); assert.doesNotMatch(source, /firebaseAuth\?\.currentUser/); });
