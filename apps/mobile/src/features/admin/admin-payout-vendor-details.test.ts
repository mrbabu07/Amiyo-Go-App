import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("admin payout review shows vendor, shop and safe payout destination details", () => {
  const screen = readFileSync(new URL("./AdminPayoutsScreen.tsx", import.meta.url), "utf8");
  const api = readFileSync(new URL("../operations/operations.api.ts", import.meta.url), "utf8");

  for (const label of ["Vendor details", "Business", "Owner", "Phone", "Email", "Vendor status", "Shop(s)", "Request details", "Account ID"]) assert.match(screen, new RegExp(label.replace(/[()]/g, "\\$&")));
  assert.match(screen, /item\.bankAccount\.verifiedAt/);
  assert.match(screen, /item\.bankAccount\.isDefault/);
  assert.match(screen, /accountNumberMasked/);
  assert.doesNotMatch(screen, /encryptedPayload/);
  assert.match(api, /ownerName: string \| null/);
  assert.match(api, /verifiedAt: string \| null/);
});
