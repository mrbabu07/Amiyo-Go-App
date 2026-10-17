import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
const source = readFileSync(new URL("./VendorProductFormScreen.tsx", import.meta.url), "utf8");
test("seller product form scopes catalog, workspace, uploads and save completion by account", () => { assert.match(source, /useCurrentUser\(\)/); assert.match(source, /\["vendor", "products", user\?\.uid\]/); assert.match(source, /\["vendor", "workspace", user\?\.uid\]/); assert.match(source, /pickAndUploadImage\(owner, "product"\)/); assert.match(source, /activeUid\.current === owner\.uid/); assert.doesNotMatch(source, /firebaseAuth\?\.currentUser/); });
