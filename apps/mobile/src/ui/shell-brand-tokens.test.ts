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

test("workspace dark mode does not fall back to the legacy slate palette", () => {
  assert.match(shell, /darkPalette\.background/);
  assert.match(shell, /darkPalette\.surface/);
  assert.match(shell, /darkPalette\.border/);
  assert.doesNotMatch(shell, /#0f172a|#111827|#1e293b|#334155|#f8fafc|#94a3b8|#fdba74|#cbd5e1/i);
});

test("admin shell resolves the persisted theme and keeps light navigation light", () => {
  assert.match(shell, /themeMode === "dark"/);
  assert.match(shell, /adminSidebar: \{ backgroundColor: colors\.surface/);
  assert.match(shell, /adminDarkSidebar: \{ backgroundColor: darkPalette\.surface/);
  assert.match(shell, /dark=\{dark\}/);
});
