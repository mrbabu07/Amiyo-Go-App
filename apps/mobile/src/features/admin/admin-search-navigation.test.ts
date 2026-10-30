import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("admin global search opens the desired record directly", () => {
  const source = readFileSync(new URL("./AdminGlobalSearch.tsx", import.meta.url), "utf8");
  assert.match(source, /onPress=\{\(\) => open\(result\.href\)\}/);
  assert.match(source, /if \(first\) open\(first\.href\)/);
  assert.doesNotMatch(source, /setSelected\(result\)/);
});
