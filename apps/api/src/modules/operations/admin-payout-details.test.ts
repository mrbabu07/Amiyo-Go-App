import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("finance payout response includes operational vendor details without exposing encrypted account data", () => {
  const source = readFileSync(new URL("./operations.service.js", import.meta.url), "utf8");

  assert.match(source, /members: \{ where: \{ role: "VENDOR_OWNER", status: "active" \}/);
  assert.match(source, /shops: \{ orderBy:/);
  assert.match(source, /normalizedEmail: true, normalizedPhone: true/);
  assert.match(source, /isDefault: true, verifiedAt: true/);
  const payoutsMethod = source.slice(source.indexOf("async payouts(session"), source.indexOf("async reviewPayout"));
  assert.doesNotMatch(payoutsMethod, /encryptedPayload/);
});
