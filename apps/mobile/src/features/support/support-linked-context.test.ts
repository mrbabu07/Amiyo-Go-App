import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { URL } from "node:url";

test("customer support thread exposes account-scoped verified order and return links", () => {
  const source = readFileSync(new URL("./SupportThreadScreen.tsx", import.meta.url), "utf8");
  assert.match(source, /\["support", "mine", user\?\.uid\]/);
  assert.match(source, /retry: false/);
  assert.match(source, /`\/orders\/\$\{ticket\.orderId\}`/);
  assert.match(source, /`\/return\/\$\{ticket\.returnId\}`/);
  assert.match(source, /accessibilityRole="link"/);
});

test("admin support links verified cases into operational workspaces", () => {
  const support = readFileSync(new URL("./AdminSupportScreen.tsx", import.meta.url), "utf8");
  const returns = readFileSync(new URL("../admin/AdminReturnsScreen.tsx", import.meta.url), "utf8");
  assert.match(support, /`\/admin\/orders\/\$\{ticket\.orderId\}`/);
  assert.match(support, /pathname: "\/admin\/returns"/);
  assert.match(support, /returnId: ticket\.returnId/);
  assert.match(support, /replyToTicket\(user!, id, body\)/);
  assert.match(support, /retry: false, mutationFn: \(\{ id, body \}/);
  assert.match(support, /Reply to customer/);
  assert.match(support, /ticket\.status !== "closed"/);
  assert.match(support, /message\.senderId === ticket\.userId \? "Customer" : "Support"/);
  assert.match(support, /message\.attachments\.map/);
  assert.match(returns, /returnId\?: string/);
  assert.match(returns, /validReturnSelection\(params\.returnId\)/);
  assert.match(returns, /\^\[0-9a-f\]/);
});
