import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./ChatThreadScreen.tsx", import.meta.url), "utf8");

test("chat thread uses premium marketplace bubbles and composer", () => {
  assert.match(source, /boxShadow: "0 10px 30px rgba\(11,31,58,\.08\)"/);
  assert.match(source, /borderBottomLeftRadius: 4/);
  assert.match(source, /borderBottomRightRadius: 4/);
  assert.match(source, /body\.length}\/2000/);
  assert.match(source, /Protected marketplace conversation/);
});

test("chat composer exposes safe accessible states", () => {
  assert.match(source, /maxLength=\{2000\}/);
  assert.match(source, /accessibilityState=\{\{ busy: send\.isPending/);
  assert.match(source, /accessibilityRole="alert"/);
  assert.match(source, /minHeight: 44/);
  assert.doesNotMatch(source, /#bae6fd|#fef2f2|Ã|Â|â/);
});
