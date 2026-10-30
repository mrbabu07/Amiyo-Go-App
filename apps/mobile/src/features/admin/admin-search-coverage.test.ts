import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("high-volume admin queues expose searchable dynamic records", () => {
  for (const file of ["AdminCategoryRequestsScreen.tsx", "AdminContentScreen.tsx"]) {
    const source = readFileSync(new URL(`./${file}`, import.meta.url), "utf8");
    assert.match(source, /TextInput/);
    assert.match(source, /\.filter\(/);
    assert.match(source, /Retry/);
  }
});
