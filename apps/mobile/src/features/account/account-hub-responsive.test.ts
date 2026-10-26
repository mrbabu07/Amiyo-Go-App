import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./AccountScreen.tsx", import.meta.url), "utf8");

test("account hub applies compact helpers only on narrow screens", () => {
  assert.match(source, /useWindowDimensions\(\)\.width < 620/);
  assert.match(source, /compact && responsive\.panel/);
  assert.match(source, /compact && responsive\.field/);
  assert.match(source, /compact && responsive\.choices/);
  assert.match(source, /compact && responsive\.metric/);
  assert.doesNotMatch(source, /\[styles\.panel, responsive\.panel\]/);
});

test("account hub uses the premium marketplace palette", () => {
  assert.match(source, /hero: \{ backgroundColor: colors\.navy/);
  assert.match(source, /tone: colors\.primarySoft/);
  assert.match(source, /tone: colors\.accentSoft/);
  assert.match(source, /backgroundColor: colors\.background/);
  assert.doesNotMatch(source, /#fff|#f8fafc|#f1f5f9|#ecfdf5|#eef2f7|#cbd5e1|#fecaca|#fed7aa|#94a3b8|#2563eb|#db2777|#7c3aed/);
});

test("account hub exposes navigation and sign-out controls as buttons", () => {
  assert.match(source, /accessibilityLabel="Back to home" accessibilityRole="button"/);
  assert.match(source, /accessibilityLabel="Sign out" accessibilityRole="button"/);
});
