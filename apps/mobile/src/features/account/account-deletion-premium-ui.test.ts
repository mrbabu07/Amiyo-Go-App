import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./AccountDeletionScreen.tsx", import.meta.url), "utf8");

test("account deletion requires explicit informed confirmation", () => {
  assert.match(source, /confirmation === "DELETE" && acknowledged/);
  assert.match(source, /accessibilityRole="checkbox"/);
  assert.match(source, /30-day recovery window/);
  assert.match(source, /Type DELETE to confirm/);
  assert.match(source, /disabled=\{!canSubmit\}/);
});

test("account deletion remains account scoped and premium", () => {
  assert.match(source, /activeUid\.current !== owner\.uid/);
  assert.match(source, /\["me", "deletion", user\?\.uid\]/);
  assert.match(source, /compact && styles\.heroCompact/);
  assert.match(source, /backgroundColor: colors\.navy/);
  assert.doesNotMatch(source, /#fff|#f8fafc|#fecaca/);
});
