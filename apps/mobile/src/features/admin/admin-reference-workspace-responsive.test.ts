import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./AdminReferenceWorkspaceScreen.tsx", import.meta.url), "utf8");

test("reference admin workspaces use operational cards on mobile", () => {
  assert.match(source, /useWindowDimensions\(\)\.width < 720/);
  assert.match(source, /compact \? <View style=\{styles\.mobileList\}>/);
  assert.match(source, /row\.cells\.slice\(0, -1\)/);
  assert.match(source, /styles\.mobileAction/);
  assert.match(source, /compact && styles\.summaryCompact/);
  assert.match(source, /adjustsFontSizeToFit numberOfLines=\{1\}/);
});
