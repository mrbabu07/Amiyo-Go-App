import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { URL } from "node:url";
import { returnSchema } from "@amiyo/contracts";

test("public return history validates status timestamps and strips internal event fields", () => {
  const event = { id: "11111111-1111-4111-8111-111111111111", fromStatus: "REQUESTED", toStatus: "REJECTED", createdAt: "2026-10-03T12:00:00.000Z" };
  const schema = returnSchema.pick({ events: true });
  assert.deepEqual(schema.parse({ events: [{ ...event, note: "internal", actorId: "private", metadata: { evidenceStorageKeys: ["private"] } }] }), { events: [event] });
  assert.equal(schema.safeParse({ events: [{ ...event, createdAt: "invalid" }] }).success, false);
  assert.equal(schema.safeParse({ events: [{ ...event, toStatus: "UNKNOWN" }] }).success, false);
  assert.deepEqual(schema.parse({ events: [] }), { events: [] });
});

test("return screen wires recorded history instead of inferring completed workflow stages", () => {
  const source = readFileSync(new URL("../operations/ReturnDetailScreen.tsx", import.meta.url), "utf8");
  assert.match(source, /item\.events\.map/);
  assert.match(source, /date=\{event\.createdAt\}/);
  assert.match(source, /Event history is unavailable/);
  assert.doesNotMatch(source, /statuses\.map|currentIndex|index <=/);
});
