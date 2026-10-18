import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./AdminVendorDetailScreen.tsx", import.meta.url), "utf8");

test("admin vendor 360 stays readable and account safe on mobile", () => {
  assert.match(source, /useWindowDimensions\(\)\.width < 620/);
  assert.match(source, /\["admin", "workspace", userId\]/);
  assert.match(source, /user\?\.uid !== userId/);
  assert.match(source, /compact && styles\.heroCompact/);
  assert.match(source, /compact && styles\.metricCompact/);
  assert.match(source, /compact && styles\.actionCompact/);
  assert.match(source, /compact && styles\.listRowCompact/);
  assert.doesNotMatch(source, /à§³|Â·|â†’/);
});
