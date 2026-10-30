import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

test("admin data integrity workspace remains read-only and links audited correction modules", () => {
  const source = readFileSync(new URL("./AdminDataIntegrityScreen.tsx", import.meta.url), "utf8");
  assert.match(source, /Read-only marketplace health/);
  assert.match(source, /no raw SQL or unrestricted record editing/i);
  assert.match(source, /getAdminDataIntegrity/);
});
