import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./CustomerReturnForm.tsx", import.meta.url), "utf8");

test("return form communicates progress with active and completed stages", () => {
  assert.match(source, /const active = \(review \? 3 : step\) === index/);
  assert.match(source, /const complete = \(review \? 3 : step\) > index/);
  assert.match(source, /stageActive/);
  assert.match(source, /stageComplete/);
  assert.match(source, /name="checkmark"/);
});

test("return form uses premium mobile-safe controls", () => {
  assert.match(source, /minHeight: 50/);
  assert.match(source, /textAlignVertical: "top"/);
  assert.match(source, /backgroundColor: colors\.surface, borderColor: colors\.border/);
  assert.match(source, /light: \{ color: colors\.surface/);
  assert.doesNotMatch(source, /#fff|Ã|Â|â/);
});
