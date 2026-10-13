import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";

const source = readFileSync(fileURLToPath(new URL("./AdminReturnsScreen.tsx", import.meta.url).href), "utf8");

test("admin returns use evidence-based reverse logistics actions", () => {
  assert.match(source, /applyAdminReturnLogisticsAction/);
  assert.match(source, /expectedVersion: detail\.data\.version/);
  assert.match(source, /state === "schedule_pickup"/);
  assert.match(source, /state === "picked_up"/);
  assert.match(source, /state === "in_transit"/);
  assert.doesNotMatch(source, /APPROVED: \["PICKUP_SCHEDULED"\]/);
  assert.doesNotMatch(source, /PICKUP_SCHEDULED: \["RECEIVED"\]/);
});
