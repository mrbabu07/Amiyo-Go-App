import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./AdminOrdersScreen.tsx", import.meta.url), "utf8");

test("admin order filters and controls fit narrow screens", () => {
  assert.match(source, /useWindowDimensions\(\)\.width < 620/);
  assert.match(source, /compact && responsive\.metric/);
  assert.match(source, /compact && responsive\.filter/);
  assert.match(source, /compact && responsive\.field/);
  assert.match(source, /compact && responsive\.button/);
  assert.match(source, /adjustsFontSizeToFit numberOfLines=\{1\}/);
});
