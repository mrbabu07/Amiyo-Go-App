import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const screenPath = new URL("./AdminVendorsScreen.tsx", import.meta.url);
const apiPath = new URL("./admin.api.ts", import.meta.url);

test("admin KYC documents use audited signed access without exposing storage keys", async () => {
  const [screen, api] = await Promise.all([readFile(screenPath, "utf8"), readFile(apiPath, "utf8")]);
  assert.doesNotMatch(screen, /document\.storageKey/);
  assert.doesNotMatch(screen, /firebaseAuth/);
  assert.match(screen, /accessAdminKycDocument/);
  assert.match(screen, /Linking\.openURL/);
  assert.match(screen, /\["admin", "workspace", user\?\.uid\]/);
  assert.match(screen, /Secure 5-minute access/);
  assert.match(api, /adminKycDocumentAccessSchema\.parse/);
  assert.match(api, /documents\/\$\{encodeURIComponent\(documentId\)\}\/access/);
});
