import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./AdminPayoutsScreen.tsx", import.meta.url), "utf8");

test("admin payout settlement cards remain usable on mobile", () => {
  assert.match(source, /useWindowDimensions\(\)\.width < 620/);
  assert.match(source, /compact && styles\.cardCompact/);
  assert.match(source, /compact && styles\.cardTopCompact/);
  assert.match(source, /compact && styles\.detailCompact/);
  assert.match(source, /compact && styles\.actionCompact/);
  assert.match(source, /adjustsFontSizeToFit numberOfLines=\{1\}/);
});
