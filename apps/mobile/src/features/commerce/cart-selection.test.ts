import assert from "node:assert/strict";
import test from "node:test";
import { parseCartItemIds } from "./cart-selection";

test("checkout cart selection accepts unique UUIDs and rejects malformed route values", () => {
  const first = "11111111-1111-4111-8111-111111111111";
  const second = "22222222-2222-4222-8222-222222222222";
  assert.deepEqual(parseCartItemIds(`${first},invalid,${second},${first}`), [first, second]);
  assert.deepEqual(parseCartItemIds(undefined), []);
});
