import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./ComparisonScreen.tsx", import.meta.url), "utf8");

test("comparison workspace uses responsive elevated product cards", () => {
  assert.match(source, /width < 620 && styles\.contentCompact/);
  assert.match(source, /width < 620 && styles\.titleCompact/);
  assert.match(source, /card: \{[^}]*boxShadow: "0 10px 30px rgba\(11,31,58,\.08\)"/);
  assert.match(source, /remove: \{[^}]*height: 44/);
  assert.doesNotMatch(source, /card: \{[^}]*borderWidth: 1/);
});
