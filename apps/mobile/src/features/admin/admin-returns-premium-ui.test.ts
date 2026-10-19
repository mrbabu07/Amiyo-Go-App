import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("admin returns uses branded responsive case cards", async () => {
  const source = await readFile(new URL("./AdminReturnsScreen.tsx", import.meta.url), "utf8");
  assert.match(source, /shadowColor: colors\.navy/);
  assert.match(source, /borderRadius: radius\.pill/);
  assert.match(source, /flexWrap: "wrap"/);
  assert.match(source, /placeholderTextColor=\{colors\.muted\}/);
});
