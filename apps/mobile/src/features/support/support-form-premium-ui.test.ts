import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./SupportScreen.tsx", import.meta.url), "utf8");

test("support form exposes accessible categories and evidence controls", () => {
  assert.match(source, /accessibilityRole="radiogroup"/);
  assert.match(source, /accessibilityState=\{\{ checked: category === item \}\}/);
  assert.match(source, /Attachments/);
  assert.match(source, /images or PDF/);
  assert.match(source, /accessibilityState=\{\{ busy: create\.isPending/);
});

test("support form uses themed mobile-safe feedback and actions", () => {
  assert.match(source, /function ErrorNotice/);
  assert.match(source, /accessibilityRole="alert"/);
  assert.match(source, /minHeight: 48/);
  assert.match(source, /primaryText: \{ color: colors\.surface/);
  assert.doesNotMatch(source, /#fff|Ã|Â|â/);
});
