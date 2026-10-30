import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { URL } from "node:url";

test("admin order detail uses a compact operational hierarchy", () => {
  const detail = readFileSync(new URL("./AdminOrderDetailScreen.tsx", import.meta.url), "utf8");
  const print = readFileSync(new URL("./AdminOrderPrintCenter.tsx", import.meta.url), "utf8");
  assert.match(detail, /padding: spacing\.lg/);
  assert.match(detail, /fontSize: 30/);
  assert.match(detail, /paddingVertical: 10/);
  assert.match(print, /const \[expanded, setExpanded\] = useState\(false\)/);
  assert.match(print, /expanded \? <ModuleCard/);
  assert.match(print, /compact && styles\.summaryCompact/);
  assert.match(print, /packageWide/);
});
