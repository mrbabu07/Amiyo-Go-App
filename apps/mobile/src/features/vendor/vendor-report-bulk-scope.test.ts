import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const reports = readFileSync(new URL("./VendorReportsScreen.tsx", import.meta.url), "utf8");
const bulk = readFileSync(new URL("./VendorBulkProductsScreen.tsx", import.meta.url), "utf8");

test("seller reports and bulk catalog data are account scoped", () => {
  assert.match(reports, /useCurrentUser\(\)/);
  assert.match(reports, /\["vendor", "report", user\?\.uid, days\]/);
  assert.doesNotMatch(reports, /firebaseAuth\?\.currentUser/);
  assert.match(bulk, /useCurrentUser\(\)/);
  assert.match(bulk, /\["vendor", "workspace", user\?\.uid\]/);
  assert.match(bulk, /activeUid\.current !== owner\.uid/);
  assert.match(bulk, /\[user\?\.uid\]/);
  assert.doesNotMatch(bulk, /firebaseAuth\?\.currentUser/);
});
