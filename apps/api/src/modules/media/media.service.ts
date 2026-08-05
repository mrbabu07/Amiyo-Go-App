import { randomUUID } from "node:crypto";
import type { PrismaClient } from "@prisma/client";
import type { MediaUploadInput, Session } from "@amiyo/contracts";
import { ApiProblem } from "../../middleware/api-problem.js";
import type { MediaStorageProvider } from "./firebase-storage.provider.js";

const privatePurposes = new Set(["kyc", "payment_evidence", "return_evidence"]);
const extensionByMime: Record<MediaUploadInput["mimeType"], string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "application/pdf": "pdf" };
function requirePurposeAccess(session: Session, purpose: MediaUploadInput["purpose"]) { const permission = purpose === "banner" ? "admin:manage" : ["product", "shop"].includes(purpose) ? "products:manage" : purpose === "kyc" ? "kyc:manage" : null; if (permission && !session.permissions.includes(permission)) throw new ApiProblem(403, "MEDIA_UPLOAD_FORBIDDEN", `${permission} access is required`); }
function publicUrl(storageKey: string, visibility: string) { const base = process.env.OBJECT_STORAGE_PUBLIC_URL?.replace(/\/$/, ""); return visibility === "public" && base ? `${base}/${storageKey}` : null; }

export class MediaService {
  constructor(private readonly client: PrismaClient, private readonly storage: MediaStorageProvider) {}
  async initiate(session: Session, input: MediaUploadInput) {
    requirePurposeAccess(session, input.purpose);
    const id = randomUUID(); const visibility = privatePurposes.has(input.purpose) ? "private" : "public"; const expiresAt = new Date(Date.now() + 10 * 60_000); const storageKey = `${visibility}/${input.purpose}/${session.principal.userId}/${id}.${extensionByMime[input.mimeType]}`;
    const uploadUrl = await this.storage.createUploadUrl(storageKey, input.mimeType, expiresAt);
    const row = await this.client.mediaUpload.create({ data: { id, userId: session.principal.userId, purpose: input.purpose, visibility, storageKey, originalName: input.fileName, mimeType: input.mimeType, expectedSize: input.size, checksum: input.checksum ?? null, expiresAt } });
    return { id: row.id, storageKey, uploadUrl, method: "PUT" as const, headers: { "Content-Type": input.mimeType }, expiresAt: expiresAt.toISOString() };
  }
  async complete(session: Session, id: string) {
    const row = await this.client.mediaUpload.findFirst({ where: { id, userId: session.principal.userId } }); if (!row) throw new ApiProblem(404, "MEDIA_UPLOAD_NOT_FOUND", "Media upload not found");
    if (["uploaded", "processing", "ready"].includes(row.status)) return { id: row.id, storageKey: row.storageKey, status: row.status as "uploaded" | "processing" | "ready", publicUrl: publicUrl(row.storageKey, row.visibility) };
    if (row.expiresAt <= new Date()) throw new ApiProblem(410, "MEDIA_UPLOAD_EXPIRED", "The upload ticket has expired");
    const metadata = await this.storage.metadata(row.storageKey); if (!metadata) throw new ApiProblem(409, "MEDIA_UPLOAD_INCOMPLETE", "The file has not been uploaded");
    if (metadata.size !== row.expectedSize || metadata.mimeType !== row.mimeType) { await this.storage.remove(row.storageKey); await this.client.mediaUpload.update({ where: { id }, data: { status: "rejected", uploadedSize: metadata.size, errorCode: metadata.size !== row.expectedSize ? "SIZE_MISMATCH" : "MIME_MISMATCH" } }); throw new ApiProblem(422, "MEDIA_UPLOAD_INVALID", "Uploaded file metadata does not match the ticket"); }
    await this.client.$transaction([this.client.mediaUpload.update({ where: { id }, data: { status: "uploaded", uploadedSize: metadata.size, completedAt: new Date() } }), this.client.outboxEvent.create({ data: { aggregateType: "media_upload", aggregateId: id, eventType: "media.uploaded", idempotencyKey: `media-process:${id}`, payload: { mediaUploadId: id, storageKey: row.storageKey } } })]);
    return { id: row.id, storageKey: row.storageKey, status: "uploaded" as const, publicUrl: publicUrl(row.storageKey, row.visibility) };
  }
}
