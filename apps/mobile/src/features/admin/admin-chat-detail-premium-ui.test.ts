import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./AdminChatDetailScreen.tsx", import.meta.url), "utf8");

test("admin chat detail uses premium operational conversation UI", () => {
  assert.match(source, /Audited seller support conversation/);
  assert.match(source, /boxShadow: "0 10px 30px rgba\(11,31,58,\.08\)"/);
  assert.match(source, /borderBottomRightRadius: 4/);
  assert.match(source, /body\.length}\/3000/);
});

test("admin chat detail exposes accessible safe actions", () => {
  assert.match(source, /maxLength=\{3000\}/);
  assert.match(source, /accessibilityState=\{\{ busy: send\.isPending/);
  assert.match(source, /accessibilityRole="alert"/);
  assert.match(source, /minHeight: 44/);
  assert.doesNotMatch(source, /#fff|Ã|Â|â/);
});
