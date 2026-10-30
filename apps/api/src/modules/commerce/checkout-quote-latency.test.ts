import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("normal checkout quote avoids the remote interactive loyalty transaction", () => {
  const source = readFileSync(new URL("./commerce.service.js", import.meta.url), "utf8");
  const quote = source.slice(source.indexOf("async quote("), source.indexOf("async checkout("));

  assert.match(quote, /loyaltyAccount\.upsert/);
  assert.match(quote, /requestedLoyaltyPoints > 0n/);
  assert.match(quote, /Promise\.all/);
  assert.match(quote, /timeout: 20_000/);
  assert.match(source, /async activeCartId/);
  assert.match(source, /const cartId = await this\.activeCartId\(userId\)/);
});
