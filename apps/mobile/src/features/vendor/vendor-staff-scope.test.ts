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

test("seller staff UI exposes least-privilege presets and clean save state", () => {
  for (const preset of ["Order desk", "Catalog", "Support", "Manager"]) assert.match(source, new RegExp(preset));
  assert.match(source, /TEAM SECURITY/);
  assert.match(source, /currentPermissions/);
  assert.match(source, /Permissions saved/);
  assert.match(source, /delete next\[variables\.id\]/);
  assert.match(source, /compact && styles\.summaryMetricsCompact/);
  assert.match(source, /accessibilityState=\{\{ disabled:/);
});

test("seller owner can add a registered team member responsively", () => {
  assert.match(source, /Add a team member/);
  assert.match(source, /active Amiyo account/);
  assert.match(source, /inviteVendorStaff/);
  assert.match(source, /VENDOR_MANAGER/);
  assert.match(source, /Team member account email/);
  assert.match(source, /compact && styles\.inviteCardCompact/);
  assert.match(source, /removeVendorStaff/);
  assert.match(source, /Team access activity/);
  assert.match(source, /getVendorStaffAudit/);
});
