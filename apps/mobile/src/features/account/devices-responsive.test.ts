import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./DevicesScreen.tsx", import.meta.url), "utf8");

test("connected devices stay account safe and readable on mobile", () => {
  assert.match(source, /useWindowDimensions\(\)\.width < 620/);
  assert.match(source, /\["me", "devices", user\?\.uid\]/);
  assert.match(source, /activeUid\.current === variables\.owner\.uid/);
  assert.match(source, /compact && styles\.heroCompact/);
  assert.match(source, /compact && styles\.cardCompact/);
  assert.match(source, /compact && styles\.revokeCompact/);
  assert.doesNotMatch(source, /â€¦/);
});
