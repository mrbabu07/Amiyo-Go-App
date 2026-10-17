import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./VendorStaffScreen.tsx", import.meta.url), "utf8");

test("seller staff access stays scoped to the active account", () => {
  assert.match(source, /useCurrentUser\(\)/);
  assert.match(source, /\["vendor", "staff", user\?\.uid\]/);
  assert.match(source, /owner: User/);
  assert.match(source, /activeUid\.current !== variables\.owner\.uid/);
  assert.match(source, /setDrafts\(\{\}\)/);
  assert.doesNotMatch(source, /firebaseAuth\?\.currentUser/);
});
