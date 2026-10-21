import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { URL } from "node:url";

const source = readFileSync(new URL("./VendorPayoutSettingsScreen.tsx", import.meta.url), "utf8");

test("vendor payout destinations stay identity scoped and clear on account change", () => {
  assert.match(source, /useCurrentUser/);
  assert.match(source, /\["vendor", "workspace", user\?\.uid\]/);
  assert.match(source, /variables\.owner\.uid/);
  assert.match(source, /setForm\(emptyForm\)/);
  assert.match(source, /\[user\?\.uid\]/);
  assert.doesNotMatch(source, /firebaseAuth/);
});

test("vendor payout form uses the shared contract and explicit confirmation", () => {
  assert.match(source, /saveVendorBankAccountSchema\.safeParse/);
  assert.match(source, /updateVendorBankAccount/);
  assert.match(source, /removeVendorBankAccount/);
  assert.match(source, /Make default/);
  assert.match(source, /settlement history cannot be removed|Manage payout accounts/);
  assert.match(source, /form\.accountNumber === form\.confirmAccountNumber/);
  assert.match(source, /secureTextEntry/);
  assert.match(source, /retry: false/);
});

test("vendor payout setup presents finance readiness and explicit account states", () => {
  assert.match(source, /PAYOUT READINESS/);
  assert.match(source, /verifiedCount/);
  assert.match(source, /defaultAccount/);
  assert.match(source, /Pending review/);
  assert.match(source, /styles\.default/);
  assert.match(source, /compact && styles\.securityHeroCompact/);
  assert.match(source, /compact && styles\.securityMetricsCompact/);
  assert.match(source, /compact && styles\.accountBadgesCompact/);
});
