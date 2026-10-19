import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const detail = readFileSync(new URL("./AdminOrderDetailScreen.tsx", import.meta.url), "utf8");
const refund = readFileSync(new URL("./AdminOrderRefund.tsx", import.meta.url), "utf8");

test("admin order detail and refunds keep monetary values exact", () => {
  assert.match(detail, /formatMinor\(minor\)/);
  assert.doesNotMatch(detail, /Number\(minor\)/);
  assert.match(refund, /minorToMajorInput\(remaining\)/);
  assert.match(refund, /parseMajorToMinor\(amount\)/);
  assert.match(refund, /formatMinor\(minor\)/);
  assert.doesNotMatch(refund, /Number\(remaining\)/);
  assert.doesNotMatch(refund, /Math\.round\(parsed \* 100\)/);
});
