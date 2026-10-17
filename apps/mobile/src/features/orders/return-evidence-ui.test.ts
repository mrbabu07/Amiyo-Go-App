import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { URL } from "node:url";
import test from "node:test";
import { returnEvidenceAccessSchema, returnEvidenceFileSchema } from "@amiyo/contracts";

test("private evidence links are requested on action, account guarded and previews expire", async () => {
  const source = await readFile(new URL("../operations/ReturnEvidencePanel.tsx", import.meta.url), "utf8");
  assert.ok(source.includes('["return-evidence", user?.uid, returnId, scope]'));
  assert.ok(source.includes("activeUid.current !== uid"));
  assert.doesNotMatch(source, /firebaseAuth/);
  assert.ok(source.includes("setTimeout(() => setPreview(null)"));
  assert.ok(source.includes('result.url.startsWith("https://")'));
  assert.ok(source.includes("accessReturnEvidence(user, returnId, file.id, download, scope)"));
  assert.ok(source.includes('key={`${user?.uid}:${returnId}:${scope}`}'));
  assert.doesNotMatch(source, /localStorage|AsyncStorage/);
});

test("customer evidence appears in returns cards and detail without using admin scope", async () => {
  for (const name of ["ReturnsScreen", "ReturnDetailScreen"]) {
    const source = await readFile(new URL(`../operations/${name}.tsx`, import.meta.url), "utf8");
    assert.match(source, /ReturnEvidencePanel returnId=\{item.id\} scope="customer"/);
  }
});

test("evidence responses require private-link transport and omit storage metadata", () => {
  const file = { id: "11111111-1111-4111-8111-111111111111", name: "Photo", mimeType: "image/jpeg" };
  assert.deepEqual(returnEvidenceFileSchema.parse({ ...file, storageKey: "private/photo", userId: "private-user" }), file);
  const expiresAt = "2026-10-08T12:00:00Z";
  assert.equal(returnEvidenceAccessSchema.safeParse({ url: "https://storage.example.test/signed", expiresAt }).success, true);
  for (const url of ["http://storage.example.test/file", "javascript:alert(1)", "file:///private/photo"]) assert.equal(returnEvidenceAccessSchema.safeParse({ url, expiresAt }).success, false);
  assert.equal(returnEvidenceAccessSchema.safeParse({ url: "https://storage.example.test/signed", expiresAt: "invalid" }).success, false);
});
