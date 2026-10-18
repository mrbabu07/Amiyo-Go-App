import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const homeSource = readFileSync(new URL("./CustomerHomeScreen.tsx", import.meta.url), "utf8");
const heroSource = readFileSync(new URL("./components/HeroBanner.tsx", import.meta.url), "utf8");

test("home marketplace sections adapt to compact screens", () => {
  assert.match(homeSource, /const compact = width < 620/);
  assert.match(homeSource, /compact && responsive\.villageBarCompact/);
  assert.match(homeSource, /compact && responsive\.flashHeadingCompact/);
  assert.match(homeSource, /compact && responsive\.promoCompact/);
  assert.match(homeSource, /compact && responsive\.benefitsCompact/);
});

test("home surfaces use brand canvas without outline card chrome", () => {
  assert.match(homeSource, /scrollContent: \{ backgroundColor: colors\.background/);
  assert.doesNotMatch(homeSource, /#f4f6f9|#edf1f5/i);
  assert.doesNotMatch(homeSource, /benefits: \{[^}]*borderWidth/);
});

test("hero actions and title scale for mobile", () => {
  assert.match(heroSource, /!desktop && styles\.mobileTitle/);
  assert.match(heroSource, /!desktop && styles\.mobileAction/);
});
