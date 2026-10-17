import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./AdminSupportScreen.tsx", import.meta.url), "utf8");

test("admin support writes and attachments remain account scoped", () => {
  assert.match(source, /\["support", "admin", user\?\.uid\]/);
  assert.match(source, /owner: User/);
  assert.match(source, /activeUid\.current !== variables\.owner\.uid/);
  assert.match(source, /activeUid\.current === user\.uid/);
  assert.match(source, /setDrafts\(\{\}\)/);
});
