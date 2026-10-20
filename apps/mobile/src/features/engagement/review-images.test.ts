import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { URL } from "node:url";

test("shared review photos wire independent previews, close and failed-image retry", () => {
  const source = readFileSync(new URL("./ReviewImages.tsx", import.meta.url), "utf8");
  assert.match(source, /function ReviewThumbnail/);
  assert.match(source, /`Open customer review photo \$\{index \+ 1\}`/);
  assert.match(source, /`Retry customer review photo \$\{index \+ 1\}`/);
  assert.match(source, /resizeMode="cover"/);
  assert.match(source, /thumbnail: \{[^}]*minHeight: 44[^}]*minWidth: 44/);
  assert.match(source, /onRequestClose=\{\(\) => setSelectedId\(null\)\}/);
  assert.match(source, /visible=\{Boolean\(selected\)\}/);
  assert.match(source, /Previous photo/);
  assert.match(source, /Next photo/);
  assert.match(source, /onError=\{\(\) => setFailed\(true\)\}/);
  assert.match(source, /Retry photo/);
  assert.match(source, /key=\{`\$\{selected.id\}:\$\{selected.url\}`\}/);
});
