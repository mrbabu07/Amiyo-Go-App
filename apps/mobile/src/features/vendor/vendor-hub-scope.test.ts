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

test("vendor operations presents a premium live command hierarchy", () => {
  const source = readFileSync(new URL("./VendorOperationsScreen.tsx", import.meta.url), "utf8");
  assert.match(source, /OPERATIONS PULSE/);
  assert.match(source, /priority tasks need attention/);
  assert.match(source, /grossSalesMinor/);
  assert.match(source, /fulfilmentRate/);
  assert.match(source, /compact && styles\.heroCompact/);
});
