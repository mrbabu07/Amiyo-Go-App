import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const chats = readFileSync(new URL("./AdminChatsScreen.tsx", import.meta.url), "utf8");
const detail = readFileSync(new URL("./AdminChatDetailScreen.tsx", import.meta.url), "utf8");
const activity = readFileSync(new URL("./AdminVendorActivityScreen.tsx", import.meta.url), "utf8");

test("admin chat and vendor activity summaries remain readable on mobile", () => {
  for (const source of [chats, activity]) {
    assert.match(source, /useWindowDimensions\(\)\.width < 620/);
    assert.match(source, /flexBasis: "100%", minWidth: 0/);
    assert.match(source, /adjustsFontSizeToFit numberOfLines=\{1\}/);
  }
});

test("admin seller chat composer stacks safely on mobile", () => {
  assert.match(detail, /useWindowDimensions\(\)\.width < 620/);
  assert.match(detail, /alignItems: "stretch", flexDirection: "column"/);
  assert.match(detail, /minWidth: 0, width: "100%"/);
  assert.match(detail, /minHeight: 44, width: "100%"/);
});
