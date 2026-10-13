import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { URL } from "node:url";

const thread = readFileSync(new URL("./SupportThreadScreen.tsx", import.meta.url), "utf8");
const admin = readFileSync(new URL("./AdminSupportScreen.tsx", import.meta.url), "utf8");

test("support attachments use signed access with visible pending and failure states", () => {
  for (const source of [thread, admin]) {
    assert.match(source, /accessSupportAttachment/);
    assert.match(source, /openingAttachment/);
    assert.match(source, /attachmentError/);
    assert.match(source, /accessibilityRole="alert"/);
    assert.doesNotMatch(source, /storageKey[^\n]+Linking\.openURL/);
  }
});
