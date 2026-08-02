import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("mobile operations exposes accessible delivery inspection and retry controls", async () => {
  const screen = await readFile(new URL("../apps/mobile/src/features/operations/AdminOperationsScreen.tsx", import.meta.url), "utf8");
  const api = await readFile(new URL("../apps/mobile/src/features/operations/operations.api.ts", import.meta.url), "utf8");
  assert.match(screen, /accessibilityLabel={`Retry reason/);
  assert.match(screen, /accessibilityRole="alert"/);
  assert.match(screen, /Retry delivery/);
  assert.match(screen, /reason\.trim\(\)\.length < 3/);
  assert.match(api, /deliveryQueueItemSchema\.array\(\)/);
  assert.match(api, /Idempotency-Key/);
  assert.match(api, /deliveryRetryResultSchema/);
});
