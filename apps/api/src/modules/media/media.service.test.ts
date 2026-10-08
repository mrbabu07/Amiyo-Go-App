import assert from "node:assert/strict";
import test from "node:test";
import type { PrismaClient } from "@prisma/client";
import type { Session } from "@amiyo/contracts";
import type { MediaStorageProvider } from "./firebase-storage.provider.js";
import { MediaService } from "./media.service.js";

const userId = "11111111-1111-4111-8111-111111111111";
const customer: Session = { principal: { userId, roles: ["CUSTOMER"], vendorIds: [] }, status: "ACTIVE", email: null, phone: null, profile: { firstName: null, lastName: null, displayName: "Customer", avatarStorageKey: null, locale: "en", currency: "BDT" }, permissions: ["catalog:read"], vendorMemberships: [] };
const storage: MediaStorageProvider = { createUploadUrl: async () => "https://storage.example.com/upload", metadata: async () => null, remove: async () => undefined };

test("upload status is owner scoped, read-only and does not expose storage details", async () => {
  for (const status of ["uploaded", "processing", "ready", "rejected"]) {
    const client = { mediaUpload: { findFirst: async ({ where, select }: { where: unknown; select: unknown }) => {
      assert.deepEqual(where, { id: userId, userId });
      assert.deepEqual(select, { id: true, status: true });
      return { id: userId, status };
    } } } as unknown as PrismaClient;
    assert.deepEqual(await new MediaService(client, storage).status(customer, userId), { id: userId, status, ready: status === "ready" });
  }
  const client = { mediaUpload: { findFirst: async () => null } } as unknown as PrismaClient;
  await assert.rejects(new MediaService(client, storage).status(customer, userId), /Media upload not found/);
});

test("customers cannot request privileged banner uploads", async () => { await assert.rejects(() => new MediaService({} as PrismaClient, storage).initiate(customer, { purpose: "banner", fileName: "hero.jpg", mimeType: "image/jpeg", size: 100 }), /admin:manage access is required/); });
test("customer media tickets use owned non-guessable storage keys", async () => { const client = { mediaUpload: { create: async ({ data }: { data: { id: string } }) => ({ id: data.id }) } } as unknown as PrismaClient; const ticket = await new MediaService(client, storage).initiate(customer, { purpose: "avatar", fileName: "me.jpg", mimeType: "image/jpeg", size: 100 }); assert.match(ticket.storageKey, new RegExp(`^public/avatar/${userId}/[a-f0-9-]+\\.jpg$`)); assert.equal(ticket.headers["Content-Type"], "image/jpeg"); });
