import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const screenPath = new URL("./AdminVendorsScreen.tsx", import.meta.url);

test("admin vendor control exposes premium responsive queues", async () => {
  const source = await readFile(screenPath, "utf8");
  assert.match(source, /SELLER OPERATIONS/);
  assert.match(source, /TRUST & COMPLIANCE/);
  assert.match(source, /width < 620 && styles\.heroMobile/);
  assert.match(source, /This queue is clear/);
  assert.match(source, /Open vendor 360/);
  assert.match(source, /Secure 5-minute access/);
  assert.doesNotMatch(source, /#94a3b8/);
});
