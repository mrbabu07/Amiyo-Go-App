import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./AdminSettingsScreen.tsx", import.meta.url), "utf8");

test("admin platform settings stack controls and save actions on mobile", () => {
  assert.match(source, /useWindowDimensions\(\)\.width < 620/);
  assert.match(source, /compact && styles\.toggleCompact/);
  assert.match(source, /compact && styles\.fieldCompact/);
  assert.match(source, /compact && styles\.saveBarCompact/);
  assert.match(source, /compact && styles\.saveCompact/);
  assert.match(source, /saveCopy: \{ flex: 1, minWidth: 0 \}/);
});
