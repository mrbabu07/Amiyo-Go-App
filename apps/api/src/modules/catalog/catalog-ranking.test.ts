import assert from "node:assert/strict";
import test from "node:test";
import { fuzzySearchScore, fuzzySearchThreshold, normalizeSearchValue } from "./catalog-ranking.js";

test("normalizes English and Bangla marketplace search values", () => {
  assert.equal(normalizeSearchValue("  Fresh-Fruit Box! "), "fresh fruit box");
  assert.equal(normalizeSearchValue("তাজা ফল"), "তাজা ফল");
});

test("ranks prefixes and typo corrections ahead of unrelated products", () => {
  assert.ok(fuzzySearchScore("iphon", "iPhone 15 Pro") <= fuzzySearchThreshold("iphon"));
  assert.ok(fuzzySearchScore("iphon", "Seasonal Fruit Box") > fuzzySearchThreshold("iphon"));
  assert.ok(fuzzySearchScore("fresh", "Fresh Fruit Box") < fuzzySearchScore("fresh", "Frozen Fish"));
});
