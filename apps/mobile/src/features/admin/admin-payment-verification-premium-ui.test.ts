import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("admin payment verification uses a premium responsive evidence desk", async () => {
  const source = await readFile(new URL("./AdminPaymentVerificationScreen.tsx", import.meta.url), "utf8");
  assert.match(source, /PAYMENT TRUST DESK/);
  assert.match(source, /compact && styles\.heroCompact/);
  assert.match(source, /evidenceReady/);
  assert.match(source, /Verification queue is clear/);
  assert.match(source, /shadowColor: colors\.navy/);
  assert.match(source, /accessAdminPaymentEvidence/);
  assert.match(source, /reconciliation_required/);
  assert.match(source, /Captured payment needs finance reconciliation/);
  assert.match(source, /Open refund workspace/);
});
