import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const layout = readFileSync(resolve(import.meta.dirname, "../../app/_layout.tsx"), "utf8");
const tokens = readFileSync(resolve(import.meta.dirname, "tokens.ts"), "utf8");

test("web fonts load after first render with only used families and weights", () => {
  assert.match(layout, /document\.createElement\("link"\)/);
  assert.match(layout, /Croissant\+One&family=Lora:wght@500;600&family=Quicksand:wght@400;500;600;700/);
  assert.doesNotMatch(layout, /@import url/);
  assert.doesNotMatch(layout, /Noto\+Serif/);
  assert.doesNotMatch(tokens, /Noto Serif/);
});

test("global reads use a bounded single retry and cache lifecycle", () => {
  assert.match(layout, /retry: 1/);
  assert.match(layout, /retryDelay: \(attempt\) => Math\.min\(500 \* 2 \*\* attempt, 2_000\)/);
  assert.match(layout, /gcTime: 10 \* 60_000/);
});
