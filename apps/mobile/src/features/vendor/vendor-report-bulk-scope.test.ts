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

test("seller reports use exact money and open operational order detail", () => {
  assert.match(reports, /formatMinor\(report\.data\.grossSalesMinor\)/);
  assert.match(reports, /order\.orderNumber/);
  assert.match(reports, /order\.shopName/);
  assert.match(reports, /order\.itemCount/);
  assert.match(reports, /`\/vendor\/order\/\$\{order\.id\}`/);
  assert.doesNotMatch(reports, /Number\(minor\)/);
});
