import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./AccountDataScreen.tsx", import.meta.url), "utf8");

test("account export stays readable on narrow screens", () => {
  assert.match(source, /useWindowDimensions\(\)\.width < 620/);
  assert.match(source, /\["me", "export", user\?\.uid\]/);
  assert.match(source, /compact && styles\.heroCompact/);
  assert.match(source, /compact && styles\.statCompact/);
  assert.match(source, /<ScrollView horizontal showsHorizontalScrollIndicator>/);
});
