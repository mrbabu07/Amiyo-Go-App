import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./AddressesScreen.tsx", import.meta.url), "utf8");

test("address management uses premium brand surfaces without legacy grays", () => {
  assert.match(source, /card: \{[^}]*boxShadow: "0 10px 30px rgba\(11,31,58,\.08\)"/);
  assert.match(source, /defaultBadge: \{[^}]*backgroundColor: colors\.accentSoft/);
  assert.match(source, /close: \{[^}]*backgroundColor: colors\.accentSoft/);
  assert.match(source, /defaultSwitch: \{[^}]*backgroundColor: colors\.background/);
  assert.doesNotMatch(source, /#f1f5f9|#f8fafc|#475569/);
});
