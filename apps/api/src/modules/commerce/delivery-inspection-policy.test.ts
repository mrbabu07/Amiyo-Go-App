import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const commerce = readFileSync("src/modules/commerce/commerce.service.ts", "utf8");

test("checkout snapshots the active delivery inspection promise", () => {
  assert.match(commerce, /openBoxAllowed: deliverySettings\.openBoxEnabled/);
  assert.match(commerce, /inspectionMinutes: deliverySettings\.openBoxEnabled \? deliverySettings\.inspectionMinutes : 0/);
});
