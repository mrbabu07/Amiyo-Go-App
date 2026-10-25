import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./AdminCustomersScreen.tsx", import.meta.url), "utf8");

test("customer 360 uses responsive premium override surfaces", () => {
  assert.match(source, /width < 620 && premiumStyles\.cardCompact/);
  assert.match(source, /compact && premiumStyles\.detailHeadCompact/);
  assert.match(source, /metric: \{ borderWidth: 0, borderRadius: radius\.xl, boxShadow:/);
  assert.match(source, /detail: \{ borderWidth: 0, borderRadius: radius\.xl, boxShadow:/);
  assert.match(source, /statusBad: \{ backgroundColor: colors\.primarySoft, color: colors\.danger \}/);
  assert.match(source, /CUSTOMER TRUST & RETENTION/);
  assert.match(source, /cache\.invalidateQueries\(\{ queryKey: \["admin", "customer", userId, selectedId\] \}\)/);
  assert.match(source, /pointValue <= BigInt\(data\.loyalty\.pointsBalance\)/);
  assert.match(source, /Deduction cannot exceed the current loyalty balance/);
  assert.match(source, /No matching customers/);
  assert.match(source, /Assisted phone order/);
  assert.match(source, /Prepare the customer cart only/);
  assert.match(source, /getAdminAssistedCartOptions/);
  assert.match(source, /Add to customer cart/);
});
