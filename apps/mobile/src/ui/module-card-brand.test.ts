import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./ModuleCard.tsx", import.meta.url), "utf8");

test("shared module cards use borderless premium surfaces", () => {
  assert.match(source, /borderRadius: radius\.xl/);
  assert.match(source, /boxShadow: "0 10px 30px rgba\(11,31,58,0\.08\)"/);
  assert.match(source, /shadowColor: colors\.navy/);
  assert.doesNotMatch(source, /card: \{[^}]*borderWidth:/);
  assert.doesNotMatch(source, /heading: \{[^}]*borderBottomWidth:/);
});
