import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("invoice QR siblings do not create a raw text node inside a native View", () => {
  const source = readFileSync(new URL("./components/OrderInvoiceDocument.tsx", import.meta.url), "utf8");
  const qrBox = source.slice(source.indexOf('<View style={styles.qrBox}>'), source.indexOf("</View>", source.indexOf('<View style={styles.qrBox}>')));

  assert.doesNotMatch(qrBox, /\}\s+\{qrExpiresAt/);
  assert.match(qrBox, /\}\{qrExpiresAt/);
});
