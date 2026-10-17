import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./SupportScreen.tsx", import.meta.url), "utf8");

test("customer support drafts, uploads and completion stay with one account", () => {
  assert.match(source, /activeUid\.current === ownerUid/);
  assert.match(source, /\["support", "mine", ownerUid\]/);
  assert.doesNotMatch(source, /firebaseAuth/);
});
