import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("rendered invoice never converts financial minor units through Number", () => {
  const source = readFileSync(new URL("./components/OrderInvoiceDocument.tsx", import.meta.url), "utf8");
  assert.match(source, /subtractMinorFloor/);
  assert.match(source, /formatMinor\(value\.amountMinor/);
  assert.doesNotMatch(source, /Number\([^\r\n]*amountMinor/);
});
