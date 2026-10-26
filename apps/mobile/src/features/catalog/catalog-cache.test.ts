import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./catalog.api.ts", import.meta.url), "utf8");

test("catalog requests bypass browser HTTP cache for reliable deep links", () => {
  assert.match(source, /fetch\(`\$\{apiUrl\}\$\{path\}`, \{ cache: "no-store" \}\)/);
});
