import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./VendorMarketingScreen.tsx", import.meta.url), "utf8");

test("seller vouchers stay scoped to the active account", () => {
  assert.match(source, /useCurrentUser\(\)/);
  assert.match(source, /\["vendor", "vouchers", user\?\.uid\]/);
  assert.match(source, /mutationFn: \(owner: User\)/);
  assert.match(source, /activeUid\.current !== owner\.uid/);
  assert.match(source, /\[user\?\.uid\]/);
  assert.match(source, /create\.mutate\(user\)/);
  assert.doesNotMatch(source, /firebaseAuth\?\.currentUser/);
});
