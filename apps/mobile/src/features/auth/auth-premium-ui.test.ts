import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./AuthScreen.tsx", import.meta.url), "utf8");

test("authentication entry uses premium brand surfaces", () => {
  assert.match(source, /boxShadow: "0 18px 50px rgba\(11,31,58,0\.12\)"/);
  assert.match(source, /demoPanel: \{ backgroundColor: colors\.accentSoft/);
  assert.match(source, /configError: \{ backgroundColor: colors\.primarySoft/);
  assert.match(source, /placeholderTextColor=\{colors\.muted\}/);
  assert.doesNotMatch(source, /card: \{[^}]*borderWidth: 1/);
  assert.doesNotMatch(source, /#94a3b8|#fef2f2|#4285f4/);
});
