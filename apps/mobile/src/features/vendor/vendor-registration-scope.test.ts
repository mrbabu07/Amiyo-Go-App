import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./VendorRegistrationScreen.tsx", import.meta.url), "utf8");

test("seller registration follows the active account through completion", () => {
  assert.match(source, /useCurrentUser\(\)/);
  assert.match(source, /mutationFn: \(owner: User\)/);
  assert.match(source, /activeUid\.current !== owner\.uid/);
  assert.match(source, /createSession\(owner\)/);
  assert.match(source, /\[user\?\.uid\]/);
  assert.doesNotMatch(source, /firebaseAuth\?\.currentUser/);
});
