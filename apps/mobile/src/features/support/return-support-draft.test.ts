import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { URL } from "node:url";
import { returnSupportDraft, validReturnContext } from "./return-support-draft";

test("return support drafts preserve verified identifiers and recorded status", () => {
  const item = { id: "11111111-1111-4111-8111-111111111111", orderId: "22222222-2222-4222-8222-222222222222", status: "REJECTED" as const, reasonCode: "DAMAGED", reasonDetail: "Box arrived damaged" };
  const draft = returnSupportDraft(item);
  assert.equal(draft.category, "RETURN");
  assert.equal(draft.priority, "high");
  assert.equal(draft.returnId, item.id);
  assert.equal(draft.orderId, item.orderId);
  assert.ok(draft.message.includes(item.id));
  assert.ok(draft.message.includes(item.orderId));
  assert.ok(draft.message.includes(item.reasonDetail));
  assert.match(draft.message, /Current status: REJECTED/);
  assert.doesNotMatch(returnSupportDraft({ ...item, reasonDetail: null }).message, /null|undefined/);
});

test("return support route accepts only a UUID lookup, not arbitrary draft text", () => {
  assert.equal(validReturnContext("11111111-1111-4111-8111-111111111111"), true);
  for (const value of [undefined, "", "../admin", "https://example.test", "11111111"]) assert.equal(validReturnContext(value), false);
  const context = readFileSync(new URL("./ReturnSupportContext.tsx", import.meta.url), "utf8");
  assert.match(context, /getOwnReturn\(user, returnId\)/);
  assert.match(context, /user.uid, returnId/);
  assert.match(context, /Use return details/);
  assert.doesNotMatch(context, /createTicket/);
  const form = readFileSync(new URL("./SupportScreen.tsx", import.meta.url), "utf8");
  assert.match(form, /"support", "mine", user\?\.uid/);
  assert.match(form, /if \(!current\(\)\) return/);
  assert.match(form, /retry: false/);
  assert.match(form, /returnId: linkedReturnId/);
});
