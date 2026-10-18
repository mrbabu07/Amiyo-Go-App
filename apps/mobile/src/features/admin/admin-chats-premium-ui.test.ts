import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./AdminChatsScreen.tsx", import.meta.url), "utf8");

test("admin chat inbox exposes accessible search and filters", () => {
  assert.match(source, /accessibilityRole="radiogroup"/);
  assert.match(source, /accessibilityState=\{\{ checked: !unreadOnly \}\}/);
  assert.match(source, /accessibilityState=\{\{ checked: unreadOnly \}\}/);
  assert.match(source, /name="search-outline"/);
});

test("admin chat inbox uses premium mobile-safe surfaces", () => {
  assert.match(source, /boxShadow: "0 8px 24px rgba\(11,31,58,\.06\)"/);
  assert.match(source, /minHeight: 48/);
  assert.match(source, /accessibilityRole="alert"/);
  assert.match(source, /backgroundColor: colors\.primarySoft/);
});
