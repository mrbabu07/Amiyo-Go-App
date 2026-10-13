import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { URL } from "node:url";

test("customer and seller chat stay account scoped and identify senders from persisted IDs", async () => {
  const [inbox, thread] = await Promise.all([
    readFile(new URL("./MessagesScreen.tsx", import.meta.url), "utf8"),
    readFile(new URL("./ChatThreadScreen.tsx", import.meta.url), "utf8")
  ]);
  for (const source of [inbox, thread]) {
    assert.match(source, /const user = useCurrentUser\(\)/);
  }
  assert.match(inbox, /\["chat-threads", user\?\.uid\]/);
  assert.match(thread, /\["chat-threads", accountId\]/);
  assert.match(thread, /message\.senderId === user\.uid/);
  assert.match(thread, /mine \? "You" : inboxPath\.startsWith\("\/vendor"\) \? "Customer" : "Seller"/);
  assert.doesNotMatch(thread, /index % 2/);
});
