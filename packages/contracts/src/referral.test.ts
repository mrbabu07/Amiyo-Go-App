import assert from "node:assert/strict";
import test from "node:test";
import { adminLoyaltyAdjustmentSchema } from "./admin.js";
import { referralCodeInputSchema } from "./engagement.js";

test("referral codes normalize and reject malformed values", () => {
  assert.equal(referralCodeInputSchema.parse({ code: " amiyo12ab34cd " }).code, "AMIYO12AB34CD");
  assert.equal(referralCodeInputSchema.safeParse({ code: "friend" }).success, false);
});

test("admin loyalty adjustments require positive points and audit evidence", () => {
  assert.equal(adminLoyaltyAdjustmentSchema.parse({ action: "AWARD", points: "500", reason: "Referral service recovery" }).points, "500");
  assert.equal(adminLoyaltyAdjustmentSchema.safeParse({ action: "DEDUCT", points: "0", reason: "Valid reason" }).success, false);
  assert.equal(adminLoyaltyAdjustmentSchema.safeParse({ action: "AWARD", points: "10", reason: "no" }).success, false);
});
