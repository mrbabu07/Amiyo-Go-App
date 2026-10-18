import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { URL } from "node:url";
import test from "node:test";

const source = readFileSync(new URL("./GrowthDetailScreen.tsx", import.meta.url), "utf8");

test("campaign and flash sale details use responsive marketplace cards", () => {
  assert.match(source, /useWindowDimensions\(\)\.width < 620/g);
  assert.match(source, /compact && styles\.heroCompact/);
  assert.match(source, /compact && styles\.infoCompact/);
  assert.match(source, /compact && styles\.primaryCompact/);
  assert.match(source, /compact && styles\.cardCompact/);
  assert.match(source, /minHeight: 44/);
  assert.doesNotMatch(source, /#7c2d12|Ã Â§Â³|Ã¢â€ â€™/);
});
