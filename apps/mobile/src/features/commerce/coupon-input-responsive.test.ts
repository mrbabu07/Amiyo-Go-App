import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./components/CouponInput.tsx", import.meta.url), "utf8");

test("coupon input stacks safely on narrow checkout screens", () => {
  assert.match(source, /useWindowDimensions\(\)\.width < 480/);
  assert.match(source, /compact && styles\.rowCompact/);
  assert.match(source, /compact && styles\.buttonCompact/);
  assert.match(source, /compact && styles\.removeButtonCompact/);
});

test("coupon states use brand surfaces and accessible feedback", () => {
  assert.match(source, /backgroundColor: colors\.primarySoft/);
  assert.match(source, /accessibilityRole="alert"/);
  assert.doesNotMatch(source, /#ecfdf5|#a7f3d0|#166534|#15803d|#94a3b8/i);
});
