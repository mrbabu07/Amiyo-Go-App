import assert from "node:assert/strict";
import test from "node:test";
import type { Session } from "@amiyo/contracts";
import { ReturnEvidenceAccessService } from "./return-evidence-access.service.js";

const admin = { status: "ACTIVE", permissions: ["returns:manage"], principal: { userId: "admin", roles: ["OPERATIONS_ADMIN"] } } as Session;
function setup(mimeType = "image/jpeg") {
  const calls: string[] = [];
  const client = {
    return: { findUnique: async () => ({ events: [{ actorId: "buyer", metadata: { evidenceStorageKeys: ["private/buyer/file"] } }] }) },
    mediaUpload: { findMany: async (query: any) => {
      assert.deepEqual(query.where.OR, [{ userId: "buyer", storageKey: { in: ["private/buyer/file"] } }]);
      assert.equal(query.where.visibility, "private");
      assert.equal(query.where.purpose, "return_evidence");
      assert.deepEqual(query.where.status.in, ["uploaded", "processing", "ready"]);
      return [{ id: "upload", originalName: "evidence", mimeType, storageKey: "private/buyer/file" }];
    } },
    auditLog: { create: async (input: any) => { assert.equal(input.data.after.uploadId, "upload"); assert.ok(!JSON.stringify(input).includes("https://")); calls.push("audit"); } }
  };
  const storage = { createReadUrl: async (key: string, expiry: Date, download: boolean) => {
    assert.equal(key, "private/buyer/file"); assert.ok(expiry.getTime() - Date.now() <= 300_000); assert.ok(expiry.getTime() > Date.now());
    calls.push(download ? "download" : "preview"); return "https://storage.example.test/signed";
  } };
  return { service: new ReturnEvidenceAccessService(client as never, storage), calls };
}
test("evidence listing does not sign URLs or expose private storage keys", async () => {
  const { service, calls } = setup();
  assert.deepEqual(await service.list(admin, "case"), [{ id: "upload", name: "evidence", mimeType: "image/jpeg" }]);
  assert.deepEqual(calls, []);
});
test("image preview is audited and signed for five minutes; PDF is download-only", async () => {
  const image = setup(); await image.service.access(admin, "case", "upload", false); assert.deepEqual(image.calls, ["audit", "preview"]);
  const pdf = setup("application/pdf"); await pdf.service.access(admin, "case", "upload", false); assert.deepEqual(pdf.calls, ["audit", "download"]);
});
test("unrelated upload IDs and non-admin/inactive sessions cannot get URLs", async () => {
  const { service, calls } = setup();
  await assert.rejects(service.access(admin, "case", "unrelated", false), /not attached/);
  await assert.rejects(service.list({ ...admin, status: "SUSPENDED" }, "case"), /review access/);
  await assert.rejects(service.list({ ...admin, permissions: [] }, "case"), /review access/);
  await assert.rejects(service.list({ ...admin, principal: { ...admin.principal, roles: ["CUSTOMER"] } }, "case"), /review access/);
  assert.deepEqual(calls, []);
});
