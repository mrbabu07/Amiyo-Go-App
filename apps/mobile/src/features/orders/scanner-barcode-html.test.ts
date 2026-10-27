import assert from "node:assert/strict";
import test from "node:test";
import { scannerBarcodeHtml } from "./scanner-barcode-html";

test("scanner export uses thermal paper and never embeds arbitrary markup", () => {
  const html = scannerBarcodeHtml("AG-ORDER-123", "aW1hZ2U=");
  assert.match(html, /100mm 150mm/);
  assert.match(html, /Package identification only/);
  assert.match(html, /data:image\/png;base64,aW1hZ2U=/);
  assert.throws(() => scannerBarcodeHtml("<script>", "aW1hZ2U="), /Invalid/);
  assert.throws(() => scannerBarcodeHtml("AG-123", '\" onerror="alert(1)'), /Invalid/);
});
