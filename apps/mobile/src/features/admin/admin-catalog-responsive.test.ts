import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./AdminCatalogScreen.tsx", import.meta.url), "utf8");

test("admin catalog metrics and moderation actions remain usable on mobile", () => {
  assert.match(source, /useWindowDimensions\(\)\.width < 620/);
  assert.match(source, /flexBasis: "100%", minWidth: 0/);
  assert.match(source, /adjustsFontSizeToFit numberOfLines=\{1\}/);
  assert.match(source, /flexGrow: 1, justifyContent: "center", minHeight: 44/);
  assert.match(source, /minWidth: 300/);
});
