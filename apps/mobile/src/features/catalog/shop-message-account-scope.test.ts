import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./ShopScreen.tsx", import.meta.url), "utf8");

test("shop messaging stays with the initiating customer account", () => {
  assert.match(source, /useCurrentUser/);
  assert.match(source, /activeUid\.current !== user\.uid/);
  assert.match(source, /return \{ thread: await createThread/);
  assert.match(source, /activeUid\.current === uid/);
  assert.doesNotMatch(source, /firebaseAuth/);
});
