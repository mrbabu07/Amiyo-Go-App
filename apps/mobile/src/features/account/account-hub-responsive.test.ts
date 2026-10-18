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
