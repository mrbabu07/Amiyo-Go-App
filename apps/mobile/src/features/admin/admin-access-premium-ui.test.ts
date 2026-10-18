import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./AdminAccessScreen.tsx", import.meta.url), "utf8");

test("admin access cards use premium brand surfaces and status colors", () => {
  assert.match(source, /metric: \{[^}]*boxShadow: "0 7px 22px rgba\(11,31,58,\.06\)"/);
  assert.match(source, /card: \{[^}]*boxShadow: "0 10px 30px rgba\(11,31,58,\.08\)"/);
  assert.match(source, /cardActive: \{ backgroundColor: colors\.primarySoft \}/);
  assert.match(source, /status: \{ backgroundColor: colors\.accentSoft/);
  assert.doesNotMatch(source, /#94a3b8|#dcfce7|#166534|#fee2e2|#991b1b|#e0f2fe/);
});
