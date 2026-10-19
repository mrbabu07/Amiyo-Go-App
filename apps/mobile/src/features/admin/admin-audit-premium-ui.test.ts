import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("admin audit exposes premium evidence and safe date filtering", async () => {
  const source = await readFile(new URL("./AdminAuditScreen.tsx", import.meta.url), "utf8");
  assert.match(source, /IMMUTABLE OPERATIONS EVIDENCE/);
  assert.match(source, /mobile && styles\.heroMobile/);
  assert.match(source, /fromTime <= toTime/);
  assert.match(source, /if \(!validDateWindow\) return/);
  assert.match(source, /Enter valid dates with the start on or before the end/);
  assert.match(source, /shadowColor: colors\.navy/);
});
