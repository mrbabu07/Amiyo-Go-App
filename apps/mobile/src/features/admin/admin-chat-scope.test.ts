import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { URL } from "node:url";

const list = readFileSync(new URL("./AdminChatsScreen.tsx", import.meta.url), "utf8");
const detail = readFileSync(new URL("./AdminChatDetailScreen.tsx", import.meta.url), "utf8");
const activity = readFileSync(new URL("./AdminVendorActivityScreen.tsx", import.meta.url), "utf8");
const vendor = readFileSync(new URL("./AdminVendorDetailScreen.tsx", import.meta.url), "utf8");

test("admin chat data and mutations stay scoped to the current identity", () => {
  for (const source of [list, detail]) {
    assert.match(source, /useCurrentUser/);
    assert.match(source, /user\?\.uid/);
    assert.doesNotMatch(source, /firebaseAuth/);
  }
  assert.match(detail, /retry: false/);
  assert.match(detail, /setQueryData\(detailKey/);
  assert.match(detail, /invalidateQueries\(\{ queryKey: listKey \}\)/);
});

test("all admin seller conversation links target the real detail route", () => {
  for (const source of [list, activity, vendor]) assert.match(source, /\/admin\/chat\/\$\{/);
  assert.doesNotMatch(activity, /\/admin\/chats\/\$\{/);
});
