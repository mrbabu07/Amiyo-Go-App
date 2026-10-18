import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./CartScreen.tsx", import.meta.url), "utf8");

test("cart keeps checkout controls readable on narrow screens", () => {
  assert.match(source, /useWindowDimensions\(\)\.width < 620/);
  assert.match(source, /\["cart", user\?\.uid \?\? null\]/);
  assert.match(source, /compact && styles\.columnsCompact/);
  assert.match(source, /compact && styles\.itemCompact/);
  assert.match(source, /compact && styles\.summaryCompact/);
  assert.doesNotMatch(source, /à§³|Â·|â€¦/);
});
