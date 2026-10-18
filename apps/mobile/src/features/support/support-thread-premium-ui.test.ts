import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./SupportThreadScreen.tsx", import.meta.url), "utf8");

test("support thread uses a premium protected composer", () => {
  assert.match(source, /Reply to support/);
  assert.match(source, /protected ticket/);
  assert.match(source, /boxShadow: "0 12px 34px rgba\(11,31,58,\.10\)"/);
  assert.match(source, /accessibilityState=\{\{ busy: reply\.isPending/);
  assert.match(source, /name="send-outline"/);
});

test("support messages and errors remain mobile accessible", () => {
  assert.match(source, /borderBottomRightRadius: 4/);
  assert.match(source, /minHeight: 44/);
  assert.match(source, /accessibilityRole="alert"/);
  assert.match(source, /primaryText: \{ color: colors\.surface/);
  assert.doesNotMatch(source, /#fff|Ã|Â|â/);
});
