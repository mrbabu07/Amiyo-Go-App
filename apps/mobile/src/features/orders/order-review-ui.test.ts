import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./OrderReviewForm.tsx", import.meta.url), "utf8");

test("order review offers a premium rating and photo workflow", () => {
  assert.match(source, /accessibilityRole="radiogroup"/);
  assert.match(source, /rating >= value \? "star" : "star-outline"/);
  assert.match(source, /Optional · up to 5 · public with your review/);
  assert.match(source, /styles\.photoCard/);
  assert.match(source, /Check image processing/);
});

test("order review actions and feedback are accessible", () => {
  assert.match(source, /minHeight: 54/);
  assert.match(source, /textAlignVertical: "top"/);
  assert.match(source, /accessibilityRole="alert"/);
  assert.match(source, /ActivityIndicator color=\{colors\.surface\}/);
  assert.doesNotMatch(source, /#fff|Ã|Â|â/);
});
