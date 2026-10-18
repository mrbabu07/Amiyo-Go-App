import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./AdminCouponsScreen.tsx", import.meta.url), "utf8");

test("admin coupon forms and performance cards remain usable on mobile", () => {
  assert.match(source, /useWindowDimensions\(\)\.width < 620/);
  assert.match(source, /flexBasis: "100%", minWidth: 0, width: "100%"/);
  assert.match(source, /flexGrow: 1, justifyContent: "center", minHeight: 44/);
  assert.match(source, /flexBasis: "46%", minWidth: 0/);
  assert.match(source, /adjustsFontSizeToFit numberOfLines=\{1\}/);
});
