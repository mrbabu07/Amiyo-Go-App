import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { URL } from "node:url";
import test from "node:test";

test("private evidence links are requested on action, account guarded and previews expire", async () => {
  const source = await readFile(new URL("../admin/ReturnEvidencePanel.tsx", import.meta.url), "utf8");
  assert.ok(source.includes('["return-evidence", user?.uid, returnId]'));
  assert.ok(source.includes("firebaseAuth?.currentUser?.uid !== uid"));
  assert.ok(source.includes("setTimeout(() => setPreview(null)"));
  assert.ok(source.includes('result.url.startsWith("https://")'));
  assert.ok(source.includes("accessReturnEvidence(user, returnId, file.id, download)"));
  assert.doesNotMatch(source, /localStorage|AsyncStorage/);
});
