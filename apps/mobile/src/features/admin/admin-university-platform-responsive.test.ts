import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const university = readFileSync(new URL("./AdminUniversityScreen.tsx", import.meta.url), "utf8");
const platform = readFileSync(new URL("./AdminPlatformScreen.tsx", import.meta.url), "utf8");

test("admin university cards stack into a mobile operating guide", () => {
  assert.match(university, /useWindowDimensions\(\)\.width < 620/);
  assert.match(university, /compact && styles\.cardCompact/);
  assert.match(university, /flexBasis: "100%", minWidth: 0, width: "100%"/);
});

test("platform taxonomy choices preserve mobile touch targets", () => {
  assert.match(platform, /useWindowDimensions\(\)\.width < 620/);
  assert.match(platform, /flexGrow: 1, justifyContent: "center", minHeight: 44/);
});
