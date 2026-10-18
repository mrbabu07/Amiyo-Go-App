import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./AdminOfferFormScreen.tsx", import.meta.url), "utf8");

test("admin offer editor stacks fields and actions on mobile", () => {
  assert.match(source, /useWindowDimensions\(\)\.width < 620/);
  assert.match(source, /compact && \{ flexBasis: "100%", minWidth: 0, width: "100%" \}/);
  assert.match(source, /compact && \{ flexDirection: "column" \}/);
  assert.match(source, /compact && \{ alignItems: "center", width: "100%" \}/);
  assert.match(source, /minHeight: 46/);
});
