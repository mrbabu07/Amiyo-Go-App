import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const files = ["AccountScreen.tsx", "AddressesScreen.tsx", "DevicesScreen.tsx", "AccountDataScreen.tsx", "AccountDeletionScreen.tsx"];

test("private account workspaces subscribe to identity and scope caches by UID", async () => {
  for (const file of files) {
    const source = await readFile(new URL(`./${file}`, import.meta.url), "utf8");
    assert.match(source, /useCurrentUser/);
    assert.doesNotMatch(source, /const user = firebaseAuth\?\.currentUser/);
    assert.match(source, /queryKey: \["me", [^\]]+user\?\.uid\]/);
  }
});

test("private account mutations invalidate only the initiating identity", async () => {
  const [account, addresses, devices, deletion] = await Promise.all(["AccountScreen.tsx", "AddressesScreen.tsx", "DevicesScreen.tsx", "AccountDeletionScreen.tsx"].map((file) => readFile(new URL(`./${file}`, import.meta.url), "utf8")));
  assert.match(account, /activeUid\.current === owner\.uid/);
  assert.match(account, /\["me", "dashboard", owner\.uid\]/);
  assert.match(addresses, /refresh\(owner\.uid\)/);
  assert.match(devices, /variables\.owner\.uid/);
  assert.match(deletion, /\["me", "deletion", owner\.uid\]/);
});
