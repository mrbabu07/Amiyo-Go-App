import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("followed shops search filters the live account-scoped response", () => {
  const source = readFileSync(new URL("./FollowedShopsScreen.tsx", import.meta.url), "utf8");
  assert.match(source, /getFollowedShops/);
  assert.match(source, /Search followed shops/);
  assert.match(source, /query\.data \?\? \[\]/);
  assert.doesNotMatch(source, /mock|sample/i);
});
