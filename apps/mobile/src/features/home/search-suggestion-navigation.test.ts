import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { URL } from "node:url";

const source = readFileSync(new URL("./components/StoreHeader.tsx", import.meta.url), "utf8");

test("storefront search suggestions navigate before input blur removes the dropdown", () => {
  assert.match(source, /onPressIn=\{\(\) => chooseSuggestion\(suggestion\)\}/);
  assert.match(source, /chooseSuggestion = \(suggestion: SearchSuggestion\) => \{ setFocused\(false\); onSelect\(suggestion\); \}/);
  assert.match(source, /href: `\/product\/\$\{product\.slug\}`/);
  assert.match(source, /href: `\/shop\/\$\{product\.shopSlug\}`/);
  assert.match(source, /href: `\/category\/\$\{category\.slug\}`/);
});

test("all-results actions also run before the search field blur timeout", () => {
  assert.match(source, /<Pressable onPressIn=\{onSearch\} style=\{styles\.allResults\}>/);
});
