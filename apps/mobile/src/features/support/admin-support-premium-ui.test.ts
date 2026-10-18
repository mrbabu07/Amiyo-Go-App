import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./AdminSupportScreen.tsx", import.meta.url), "utf8");

test("admin support provides a premium audited reply workspace", () => {
  assert.match(source, /Send a clear operational update inside this audited case/);
  assert.match(source, /boxShadow: "0 10px 30px rgba\(11,31,58,\.08\)"/);
  assert.match(source, /accessibilityState=\{\{ busy: reply\.isPending/);
  assert.match(source, /name="send-outline"/);
});

test("admin support uses themed mobile-safe feedback", () => {
  assert.match(source, /function ErrorNotice/);
  assert.match(source, /accessibilityRole="alert"/);
  assert.match(source, /minHeight: 48/);
  assert.match(source, /sendText: \{ color: colors\.surface/);
  assert.doesNotMatch(source, /#fff|#fef2f2/);
});
