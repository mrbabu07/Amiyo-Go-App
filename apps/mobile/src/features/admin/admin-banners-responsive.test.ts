import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./AdminBannersScreen.tsx", import.meta.url), "utf8");

test("admin banner controls remain usable on mobile", () => {
  assert.match(source, /useWindowDimensions\(\)\.width < 620/);
  assert.match(source, /flexBasis: "100%", minWidth: 0, width: "100%"/);
  assert.match(source, /flexGrow: 1, justifyContent: "center", minHeight: 44/);
  assert.match(source, /adjustsFontSizeToFit numberOfLines=\{1\}/);
  assert.match(source, /aspectRatio: 3/);
  assert.match(source, /STOREFRONT MERCHANDISING/);
  assert.match(source, /validSchedule/);
  assert.match(source, /validOrder/);
  assert.match(source, /validTarget/);
  assert.match(source, /disabled=\{save\.isPending \|\| !canSave\}/);
  assert.match(source, /function BannerDraftPreview/);
  assert.match(source, /LIVE CREATIVE PREVIEW/);
  assert.match(source, /compact && form\.mobileStorageKey/);
  assert.match(source, /No banners in this placement/);
});
