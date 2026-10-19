import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./AdminMarketingScreen.tsx", import.meta.url), "utf8");

test("admin voucher and flash-sale controls remain usable on mobile", () => {
  assert.match(source, /useWindowDimensions\(\)\.width < 620/);
  assert.match(source, /flexBasis: "100%", minWidth: 0, width: "100%"/);
  assert.match(source, /flexGrow: 1, justifyContent: "center", minHeight: 44/);
  assert.match(source, /adjustsFontSizeToFit numberOfLines=\{1\}/);
  assert.match(source, /productEdit: \{[^}]*flexWrap: "wrap"/);
});

test("admin marketing exposes mode-aware live campaign hierarchy", () => {
  assert.match(source, /VOUCHER OPERATIONS/);
  assert.match(source, /FLASH COMMERCE DESK/);
  assert.match(source, /liveCount/);
  assert.match(source, /liveProducts/);
  assert.match(source, /compact && styles\.heroCompact/);
  assert.match(source, /Schedule your first flash sale/);
});
