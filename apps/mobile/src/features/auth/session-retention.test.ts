import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { URL } from "node:url";

for (const file of ["./session-marker.ts", "./session-marker.web.ts"]) {
  test(`${file} keeps an active login for a rolling sixty days`, () => {
    const source = readFileSync(new URL(file, import.meta.url), "utf8");
    assert.match(source, /60 \* 24 \* 60 \* 60_000/);
    assert.match(source, /marker\.expiresAt > now/);
    assert.match(source, /expiresAt: now \+ sessionDurationMs/);
  });
}
