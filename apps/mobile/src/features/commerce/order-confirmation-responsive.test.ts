import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./OrderConfirmationScreen.tsx", import.meta.url), "utf8");

test("order confirmation keeps receipt and actions readable on mobile", () => {
  assert.match(source, /useWindowDimensions\(\)\.width < 620/);
  assert.match(source, /compact && styles\.panelCompact/);
  assert.match(source, /compact && styles\.rowCompact/);
  assert.match(source, /compact && styles\.stepCompact/);
  assert.match(source, /compact && styles\.actionCompact/);
  assert.doesNotMatch(source, /à§³|Â·|â€¦/);
});
