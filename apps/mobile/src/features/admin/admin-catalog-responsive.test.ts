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
  assert.match(source, /compact && styles\.searchCompact/);
  assert.match(source, /compact && styles\.toolbarActionCompact/);
  assert.match(source, /compact && styles\.cardCompact/);
  assert.match(source, /cardCompact: \{ maxWidth: "100%", minWidth: 0, width: "100%" \}/);
  assert.match(source, /boxShadow: "0 10px 30px rgba\(11,31,58,\.08\)"/);
  assert.doesNotMatch(source, /#f1f5f9|#f8fafc|#94a3b8/);
});
