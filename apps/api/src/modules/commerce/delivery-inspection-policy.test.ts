import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const commerce = readFileSync(new URL("../../../src/modules/commerce/commerce.service.ts", import.meta.url), "utf8");
const orders = readFileSync(new URL("../../../src/modules/orders/order.service.ts", import.meta.url), "utf8");

test("checkout snapshots the active delivery inspection promise", () => {
  assert.match(commerce, /openBoxAllowed: deliverySettings\.openBoxEnabled/);
  assert.match(commerce, /inspectionMinutes: deliverySettings\.openBoxEnabled \? deliverySettings\.inspectionMinutes : 0/);
  assert.match(orders, /deliveryInspection: \{ openBoxAllowed: order\.openBoxAllowed, inspectionMinutes: order\.inspectionMinutes \}/);
});
