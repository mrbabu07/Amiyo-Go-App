import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

for (const file of ["VendorOperationsScreen.tsx", "VendorEngagementScreen.tsx"]) {
  const source = readFileSync(new URL(`./${file}`, import.meta.url), "utf8");
  test(`${file} uses account-scoped overview data`, () => {
    assert.match(source, /useCurrentUser\(\)/);
    assert.match(source, /user\?\.uid/);
    assert.doesNotMatch(source, /firebaseAuth\?\.currentUser/);
    assert.doesNotMatch(source, /useMutation/);
  });
}
