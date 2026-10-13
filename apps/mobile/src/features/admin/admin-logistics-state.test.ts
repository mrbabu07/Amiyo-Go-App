import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";

const source = readFileSync(fileURLToPath(new URL("../operations/AdminLogisticsScreen.tsx", import.meta.url).href), "utf8");

test("logistics pickup controls require and submit the visible assignment version", () => {
  assert.match(source, /row\.status === "READY_TO_SHIP" && row\.assignment/);
  assert.match(source, /expectedAssignmentVersion: row\.assignment\?\.version \?\? null/);
  assert.match(source, /Assign an active courier or pickup staff member before confirming pickup/);
  assert.match(source, /group\.shipments\.every\(\(row\) => row\.status === "READY_TO_SHIP" && Boolean\(row\.assignment\)\)/);
  assert.match(source, /outcome: "delivered"[\s\S]*expectedAssignmentVersion: row\.assignment!\.version/);
  assert.match(source, /outcome: "failed"[\s\S]*expectedAssignmentVersion: row\.assignment!\.version/);
  assert.match(source, /failed && row\.status === "FAILED"/);
});
