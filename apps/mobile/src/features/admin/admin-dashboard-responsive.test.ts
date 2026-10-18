import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./AdminDashboardScreen.tsx", import.meta.url), "utf8");

test("admin dashboard cards remove fixed mobile widths", () => {
  assert.match(source, /useWindowDimensions\(\)\.width < 620/);
  assert.match(source, /compact && responsive\.priorityCard/);
  assert.match(source, /compact && responsive\.exceptionLane/);
  assert.match(source, /compact && responsive\.controlGroup/);
  assert.match(source, /compact && responsive\.metric/);
  assert.match(source, /adjustsFontSizeToFit numberOfLines=\{1\}/);
});
