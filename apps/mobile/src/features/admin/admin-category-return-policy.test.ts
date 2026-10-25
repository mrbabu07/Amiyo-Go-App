import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./AdminPlatformScreen.tsx", import.meta.url), "utf8");

test("admin exposes audited category return-policy presets", () => {
  assert.match(source, /Category return policies/);
  assert.match(source, /Global policy/);
  assert.match(source, /7-day returns/);
  assert.match(source, /14-day returns/);
  assert.match(source, /Non-returnable/);
  assert.match(source, /returnPolicy: \{ returnable: false/);
});
