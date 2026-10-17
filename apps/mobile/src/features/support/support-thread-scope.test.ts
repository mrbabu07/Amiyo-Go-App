import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./SupportThreadScreen.tsx", import.meta.url), "utf8");

test("customer support replies and attachments stay account scoped", () => {
  assert.match(source, /\["support", "mine", user\?\.uid\]/);
  assert.match(source, /mutationFn: \(owner: User\)/);
  assert.match(source, /activeUid\.current !== owner\.uid/);
  assert.match(source, /activeUid\.current === user\.uid/);
  assert.match(source, /\[id, user\?\.uid\]/);
});
