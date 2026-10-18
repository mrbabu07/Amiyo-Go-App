import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./AdminOffersScreen.tsx", import.meta.url), "utf8");

test("admin promotional offers stack into mobile campaign cards", () => {
  assert.match(source, /useWindowDimensions\(\)\.width < 620/);
  assert.match(source, /compact && styles\.imageWrapCompact/);
  assert.match(source, /compact && styles\.contentCompact/);
  assert.match(source, /compact && styles\.primaryCompact/);
  assert.match(source, /compact && styles\.buttonCompact/);
  assert.match(source, /adjustsFontSizeToFit numberOfLines=\{1\}/);
  assert.doesNotMatch(source, /Â|â€”|à§³/);
});
