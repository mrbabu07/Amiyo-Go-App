import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./DiscoveryIndexScreens.tsx", import.meta.url), "utf8");

test("category discovery stacks controls and cards on narrow screens", () => {
  assert.match(source, /const compact = width < 620/);
  assert.match(source, /compact && styles\.categoryToolsCompact/);
  assert.match(source, /compact && styles\.categorySearchCompact/);
  assert.match(source, /compact && styles\.childCardCompact/);
  assert.match(source, /childCardCompact: \{ flexBasis: "100%", minWidth: 0 \}/);
});

test("verified shop grid supports one-column phones and premium cards", () => {
  assert.match(source, /width >= 420 \? 2 : 1/);
  assert.match(source, /style=\{\(\{ pressed \}\) => \[styles\.shopCard/);
  assert.match(source, /const cardShadow = Platform\.select/);
  assert.doesNotMatch(source, /backgroundColor: "#f8fafc"/);
});
