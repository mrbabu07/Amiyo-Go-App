import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { URL } from "node:url";

const source = readFileSync(new URL("./VendorKycScreen.tsx", import.meta.url), "utf8");

test("vendor KYC drafts and workspace stay account scoped", () => {
  assert.match(source, /useCurrentUser/);
  assert.match(source, /\["vendor", "workspace", user\?\.uid\]/);
  assert.match(source, /activeUid\.current === owner\.uid/);
  assert.match(source, /variables\.owner\.uid/);
  assert.match(source, /\[user\?\.uid\]/);
  assert.doesNotMatch(source, /firebaseAuth/);
});

test("vendor KYC UI never renders private storage keys as filenames", () => {
  assert.match(source, /file\.originalName/);
  assert.doesNotMatch(source, /file\.storageKey\.split/);
  assert.match(source, /uploadError/);
  assert.match(source, /retry: false/);
});

test("vendor KYC waits for security processing and legacy settings stay account scoped", () => {
  const settings = readFileSync(new URL("./VendorSettingsScreen.tsx", import.meta.url), "utf8");
  assert.match(source, /waitForMediaUploadReady/);
  assert.match(settings, /waitForMediaUploadReady/);
  assert.match(settings, /\["vendor", "workspace", user\?\.uid\]/);
  assert.doesNotMatch(settings, /firebaseAuth/);
  assert.doesNotMatch(settings, /storageKey\.split/);
});

test("vendor KYC presents and enforces the verification workflow", () => {
  assert.match(source, /\["SUBMITTED", "REVIEWING", "APPROVED"\]\.includes/);
  assert.match(source, /latest\?\.rejectionReason/);
  assert.match(source, /NEW SUBMISSION EVIDENCE/);
  assert.match(source, /ReviewStep/);
  assert.match(source, /Review in progress/);
  assert.match(source, /accessibilityState=\{\{ disabled:/);
  assert.match(source, /compact && styles\.progressCardCompact/);
});
