import assert from "node:assert/strict";
import test from "node:test";
import { scannerBarcode } from "./scanner-barcode.js";

test("scanner barcode emits PNG for parcel identifiers and rejects arbitrary markup", async () => {
  const result = await scannerBarcode("AMIYO-PARCEL-123456");
  assert.equal(result.parcelId, "AMIYO-PARCEL-123456");
  assert.equal(Buffer.from(result.pngBase64, "base64").subarray(1, 4).toString(), "PNG");
  await assert.rejects(scannerBarcode('<img src="x">'), /Invalid/);
});
