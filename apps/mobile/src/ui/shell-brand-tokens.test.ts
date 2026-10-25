import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const shell = readFileSync(new URL("./Screen.tsx", import.meta.url), "utf8");
const tokens = readFileSync(new URL("./tokens.ts", import.meta.url), "utf8");

test("admin and seller shells use brand-safe semantic contrast tokens", () => {
  assert.equal((tokens.match(/onPrimary: "#FAF7F0"/g) || []).length, 2);
  for (const token of ["colors.onPrimary", "colors.shellMuted", "colors.shellAccent", "colors.shellDanger"]) assert.match(shell, new RegExp(token.replace(".", "\\.")));
  assert.doesNotMatch(shell, /rgba\(30,112,152|#38bdf8|#fca5a5/);
});
