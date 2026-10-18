import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const content = readFileSync(new URL("./AdminContentScreen.tsx", import.meta.url), "utf8");
const newsletter = readFileSync(new URL("./AdminNewsletterScreen.tsx", import.meta.url), "utf8");

test("admin content actions remain touch friendly on mobile", () => {
  assert.match(content, /useWindowDimensions\(\)\.width < 620/);
  assert.match(content, /flexWrap: "wrap"/);
  assert.match(content, /flexGrow: 1, justifyContent: "center", minHeight: 44/);
});

test("newsletter metrics remain readable on mobile", () => {
  assert.match(newsletter, /useWindowDimensions\(\)\.width < 620/);
  assert.match(newsletter, /flexBasis: "100%", minWidth: 0/);
  assert.match(newsletter, /adjustsFontSizeToFit numberOfLines=\{1\}/);
});
